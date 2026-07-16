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
import { obChannel } from '../ingestion/orderbook-publisher.service';
import { OrderbookFormatterService } from './orderbook-formatter.service';
import type { NormalizedOrderBook } from '@trading-backend/exchange-adapters';

function roomFor(marketType: string, symbol: string): string {
  return `ob:${marketType}:${symbol}`;
}

/**
 * Client protocol (no auth yet):
 *   socket.emit('subscribe:orderbook', { symbol: 'BTCUSDT', marketType: 'spot' })
 *   socket.emit('unsubscribe:orderbook', { symbol: 'BTCUSDT', marketType: 'spot' })
 *   socket.on('orderbook', (snapshot) => ...)
 */
@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class OrderbookGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(OrderbookGateway.name);
  private readonly redisSub: Redis;
  private readonly roomRefCounts = new Map<string, number>();
  private readonly socketRooms = new Map<string, Set<string>>();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly formatter: OrderbookFormatterService,
  ) {
    this.redisSub = this.redis.duplicate();
    this.redisSub.on('message', (channel, message) => {
      this.handleRedisMessage(channel, message);
    });
  }

  private handleRedisMessage(channel: string, message: string): void {
    try {
      const ob = JSON.parse(message) as NormalizedOrderBook;
      ob.timestamp = new Date(ob.timestamp);
      const room = roomFor(ob.marketType, ob.symbol);
      this.server.to(room).emit('orderbook', this.formatter.format(ob));
    } catch (err) {
      this.logger.error(
        `Failed to relay orderbook on ${channel}`,
        err as Error,
      );
    }
  }

  @SubscribeMessage('subscribe:orderbook')
  async handleSubscribe(
    client: Socket,
    payload: { symbol: string; marketType: 'spot' | 'futures' },
  ): Promise<void> {
    const room = roomFor(payload.marketType, payload.symbol);
    await client.join(room);
    this.trackSocketRoom(client.id, room);
    await this.ensureChannelSubscribed(
      payload.marketType,
      payload.symbol,
      room,
    );
  }

  @SubscribeMessage('unsubscribe:orderbook')
  async handleUnsubscribe(
    client: Socket,
    payload: { symbol: string; marketType: 'spot' | 'futures' },
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
      const [, marketType, symbol] = room.split(':');
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
      const channel = obChannel('binance', marketType, symbol);
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
      const channel = obChannel('binance', marketType, symbol);
      await this.redisSub.unsubscribe(channel);
      this.logger.log(`Unsubscribed from ${channel} (no clients for ${room})`);
    } else {
      this.roomRefCounts.set(room, count - 1);
    }
  }
}
