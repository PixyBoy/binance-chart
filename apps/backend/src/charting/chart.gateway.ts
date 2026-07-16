import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../common/redis/redis.constants';
import { CHART_FORMATTER } from './chart-formatter.interface';
import type { IChartDataFormatter } from './chart-formatter.interface';
import { liveKlineChannel } from '../ingestion/live-kline-publisher.service';
import { SubscribeDto } from './dto/subscribe.dto';
import type { NormalizedKline } from '@trading-backend/exchange-adapters';

function roomFor(marketType: string, symbol: string): string {
  return `${marketType}:${symbol}`;
}

/**
 * Client protocol (no auth in this phase):
 *   socket.emit('subscribe', { symbol: 'BTCUSDT', marketType: 'spot' })
 *   socket.emit('unsubscribe', { symbol: 'BTCUSDT', marketType: 'spot' })
 *   socket.on('kline', (candle) => ...)  // pushed for every room the socket joined
 *
 * Only subscribes to a symbol's Redis channel while at least one client
 * wants it (refcounted), and unsubscribes the moment the last client
 * leaves — with potentially thousands of symbols, broadcasting
 * everything to everyone regardless of interest doesn't scale.
 */
@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class ChartGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChartGateway.name);
  private readonly redisSub: Redis;
  private readonly roomRefCounts = new Map<string, number>();
  private readonly socketRooms = new Map<string, Set<string>>();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(CHART_FORMATTER) private readonly formatter: IChartDataFormatter,
  ) {
    // Subscribing blocks the connection for anything else, so pub/sub
    // needs its own dedicated connection separate from REDIS_CLIENT.
    this.redisSub = this.redis.duplicate();
    this.redisSub.on('message', (channel, message) => {
      this.handleRedisMessage(channel, message);
    });
  }

  private handleRedisMessage(channel: string, message: string): void {
    try {
      const kline = JSON.parse(message) as NormalizedKline;
      kline.openTime = new Date(kline.openTime);
      kline.closeTime = new Date(kline.closeTime);

      const room = roomFor(kline.marketType, kline.symbol);
      this.server.to(room).emit('kline', this.formatter.formatCandle(kline));
    } catch (err) {
      this.logger.error(`Failed to relay message on ${channel}`, err as Error);
    }
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(client: Socket, payload: SubscribeDto): Promise<void> {
    const room = roomFor(payload.marketType, payload.symbol);
    await client.join(room);
    this.trackSocketRoom(client.id, room);
    await this.ensureChannelSubscribed(
      payload.marketType,
      payload.symbol,
      room,
    );
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    client: Socket,
    payload: SubscribeDto,
  ): Promise<void> {
    const room = roomFor(payload.marketType, payload.symbol);
    await client.leave(room);
    this.untrackSocketRoom(client.id, room);
    await this.releaseChannelIfUnused(payload.marketType, payload.symbol, room);
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const rooms = this.socketRooms.get(client.id);
    if (!rooms) return;

    for (const room of rooms) {
      const [marketType, symbol] = room.split(':');
      await this.releaseChannelIfUnused(marketType, symbol, room);
    }
    this.socketRooms.delete(client.id);
  }

  private trackSocketRoom(socketId: string, room: string): void {
    const set = this.socketRooms.get(socketId) ?? new Set<string>();
    set.add(room);
    this.socketRooms.set(socketId, set);
  }

  private untrackSocketRoom(socketId: string, room: string): void {
    this.socketRooms.get(socketId)?.delete(room);
  }

  private async ensureChannelSubscribed(
    marketType: string,
    symbol: string,
    room: string,
  ): Promise<void> {
    const count = this.roomRefCounts.get(room) ?? 0;
    this.roomRefCounts.set(room, count + 1);

    if (count === 0) {
      const channel = liveKlineChannel('binance', marketType, symbol);
      await this.redisSub.subscribe(channel);
      this.logger.log(`Subscribed to ${channel} (first client for ${room})`);
    }
  }

  private async releaseChannelIfUnused(
    marketType: string,
    symbol: string,
    room: string,
  ): Promise<void> {
    const count = this.roomRefCounts.get(room) ?? 0;
    if (count <= 1) {
      this.roomRefCounts.delete(room);
      const channel = liveKlineChannel('binance', marketType, symbol);
      await this.redisSub.unsubscribe(channel);
      this.logger.log(
        `Unsubscribed from ${channel} (no clients left for ${room})`,
      );
    } else {
      this.roomRefCounts.set(room, count - 1);
    }
  }
}
