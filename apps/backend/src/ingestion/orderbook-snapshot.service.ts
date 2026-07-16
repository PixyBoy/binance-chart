import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import type { NormalizedOrderBook } from '@trading-backend/exchange-adapters';
import { REDIS_CLIENT } from '../common/redis/redis.constants';

/**
 * Persists order book snapshots to Redis as a hash-of-JSON structure:
 * key: "ob:{exchange}:{marketType}:{symbol}", value: JSON-stringified latest snapshot.
 * GET is O(1), and old snapshots naturally expire with TTL (depth updates
 * are high-frequency, so we don't keep history).
 */
@Injectable()
export class OrderbookSnapshotService {
  private readonly logger = new Logger(OrderbookSnapshotService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async save(ob: NormalizedOrderBook): Promise<void> {
    const key = this.keyFor(ob.exchange, ob.marketType, ob.symbol);
    try {
      await this.redis.setex(
        key,
        300, // 5 min TTL — depth is live, stale snapshots aren't useful
        JSON.stringify(ob),
      );
    } catch (err) {
      this.logger.warn(
        `Failed to save order book snapshot ${key}`,
        err as Error,
      );
    }
  }

  async get(
    exchange: string,
    marketType: string,
    symbol: string,
  ): Promise<NormalizedOrderBook | null> {
    const key = this.keyFor(exchange, marketType, symbol);
    try {
      const json = await this.redis.get(key);
      if (!json) return null;
      const data = JSON.parse(json) as NormalizedOrderBook;
      data.timestamp = new Date(data.timestamp);
      return data;
    } catch (err) {
      this.logger.warn(
        `Failed to get order book snapshot ${key}`,
        err as Error,
      );
      return null;
    }
  }

  private keyFor(exchange: string, marketType: string, symbol: string): string {
    return `ob:${exchange}:${marketType}:${symbol}`;
  }
}
