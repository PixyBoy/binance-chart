import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import type { MarketEvent } from '@trading-backend/exchange-adapters';
import { REDIS_CLIENT } from '../common/redis/redis.constants';
import {
  KLINE_STREAM_KEY,
  KLINE_STREAM_MAXLEN,
} from './kline-stream.constants';

/**
 * Durable write-ahead buffer: every normalized kline event (live or
 * backfilled) is pushed here BEFORE anything tries to write it to
 * Postgres. This means a slow or momentarily failing DB never causes a
 * lost event and never blocks the Binance connection — the event just
 * waits in Redis until the consumer worker (KlineStreamConsumerService)
 * successfully persists and acknowledges it.
 */
@Injectable()
export class KlineBufferService {
  private readonly logger = new Logger(KlineBufferService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async push(event: MarketEvent): Promise<void> {
    if (event.type !== 'kline') {
      return; // orderbook events are handled separately from Fase 4
    }

    try {
      await this.redis.xadd(
        KLINE_STREAM_KEY,
        'MAXLEN',
        '~',
        KLINE_STREAM_MAXLEN,
        '*',
        'payload',
        JSON.stringify(event.payload),
      );
    } catch (err) {
      // This is the one place where a failure is genuinely dangerous
      // (Redis itself unreachable) — logged loudly so it surfaces in
      // monitoring, per the "meaningful logs only" requirement.
      this.logger.error(
        `Failed to buffer kline for ${event.payload.symbol} — event may be lost`,
        err as Error,
      );
      throw err;
    }
  }
}
