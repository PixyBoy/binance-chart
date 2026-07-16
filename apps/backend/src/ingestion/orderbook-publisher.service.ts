import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import type { NormalizedOrderBook } from '@trading-backend/exchange-adapters';
import { REDIS_CLIENT } from '../common/redis/redis.constants';

export function obChannel(
  exchange: string,
  marketType: string,
  symbol: string,
): string {
  return `ob:${exchange}:${marketType}:${symbol}`;
}

/**
 * Broadcasts order book snapshots via Redis Pub/Sub to all subscribers.
 * Independent from persistence — a slow/unavailable Redis doesn't block
 * the ingestion stream.
 */
@Injectable()
export class OrderbookPublisherService {
  private readonly logger = new Logger(OrderbookPublisherService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async publish(ob: NormalizedOrderBook): Promise<void> {
    const channel = obChannel(ob.exchange, ob.marketType, ob.symbol);
    try {
      await this.redis.publish(channel, JSON.stringify(ob));
    } catch (err) {
      this.logger.warn(
        `Failed to publish order book on ${channel}`,
        err as Error,
      );
    }
  }
}
