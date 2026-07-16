import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EXCHANGE_ADAPTER } from '@trading-backend/exchange-adapters';
import type {
  IExchangeAdapter,
  MarketType,
} from '@trading-backend/exchange-adapters';
import { KlineBufferService } from './kline-buffer.service';
import { LiveKlinePublisherService } from './live-kline-publisher.service';

/**
 * Subscribes to the live 1m kline stream and fans it out two ways:
 *   1. KlineBufferService — durable Redis Stream buffer, drained by
 *      KlineStreamConsumerService into Postgres. Guarantees no data loss.
 *   2. LiveKlinePublisherService — best-effort Redis Pub/Sub broadcast
 *      straight to connected WebSocket clients (ChartGateway), including
 *      still-forming (unclosed) candles for a live-updating chart.
 * These are independent: a slow/failing DB never delays live delivery,
 * and a quiet WebSocket audience never affects persistence.
 */
@Injectable()
export class KlineIngestionService implements OnModuleInit {
  private readonly logger = new Logger(KlineIngestionService.name);

  // TODO: move to config/DB-driven symbol list once subscription
  // management exists. Hardcoded here only for early bring-up.
  private readonly symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
  private readonly marketType: MarketType = 'spot';

  constructor(
    @Inject(EXCHANGE_ADAPTER)
    private readonly exchangeAdapter: IExchangeAdapter,
    private readonly buffer: KlineBufferService,
    private readonly livePublisher: LiveKlinePublisherService,
  ) {}

  onModuleInit(): void {
    // Fire and forget: this loop runs for the lifetime of the app.
    void this.startIngesting();
  }

  private async startIngesting(): Promise<void> {
    this.logger.log(
      `Starting kline ingestion for ${this.symbols.join(', ')} (${this.marketType})`,
    );

    const stream = this.exchangeAdapter.connectStream({
      marketType: this.marketType,
      symbols: this.symbols,
      channels: ['kline_1m'],
    });

    for await (const event of stream) {
      // Live delivery is independent of persistence — one failing must
      // never block the other.
      void this.livePublisher.publish(event);

      try {
        await this.buffer.push(event);
      } catch (err) {
        this.logger.error(
          `Failed to buffer event for ${event.payload.symbol}`,
          err as Error,
        );
      }
    }
  }
}
