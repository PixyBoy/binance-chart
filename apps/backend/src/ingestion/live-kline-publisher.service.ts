import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import type { MarketEvent } from '@trading-backend/exchange-adapters';
import { REDIS_CLIENT } from '../common/redis/redis.constants';

export function liveKlineChannel(
  exchange: string,
  marketType: string,
  symbol: string,
): string {
  return `live:${exchange}:${marketType}:${symbol}`;
}

/**
 * Fan-out for live chart updates. Every kline event (closed AND still
 * forming) is published here immediately, completely independent of the
 * durable persistence path (KlineBufferService) — a slow/backed-up DB
 * write must never delay what a connected chart sees.
 *
 * Scope note: only 1m-resolution live events are published (that's all
 * the exchange stream provides). Clients subscribed to a higher
 * timeframe get their initial bars from the REST /klines endpoint
 * (continuous aggregates) and are expected to fold subsequent 1m ticks
 * into the current bar themselves — building true server-side live
 * aggregation for every timeframe is out of scope for this phase.
 */
@Injectable()
export class LiveKlinePublisherService {
  private readonly logger = new Logger(LiveKlinePublisherService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async publish(event: MarketEvent): Promise<void> {
    if (event.type !== 'kline') return;

    const channel = liveKlineChannel(
      event.payload.exchange,
      event.payload.marketType,
      event.payload.symbol,
    );

    try {
      await this.redis.publish(channel, JSON.stringify(event.payload));
    } catch (err) {
      // Non-fatal by design: live delivery is best-effort. Persistence
      // (the durable buffer) is what guarantees no data is lost, not this.
      this.logger.warn(
        `Failed to publish live update on ${channel}`,
        err as Error,
      );
    }
  }
}
