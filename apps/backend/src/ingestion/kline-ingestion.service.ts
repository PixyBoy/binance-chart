import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EXCHANGE_ADAPTER } from '@trading-backend/exchange-adapters';
import type {
  IExchangeAdapter,
  MarketType,
} from '@trading-backend/exchange-adapters';
import { KlineBufferService } from './kline-buffer.service';

/**
 * Subscribes to the live 1m kline stream and forwards every event
 * straight into the durable Redis buffer (KlineBufferService). This
 * service intentionally does NOT talk to Postgres directly — persistence
 * is handled asynchronously by KlineStreamConsumerService, so a slow or
 * momentarily failing DB can never block or drop live Binance data.
 */
@Injectable()
export class KlineIngestionService implements OnModuleInit {
  private readonly logger = new Logger(KlineIngestionService.name);

  // TODO: move to config/DB-driven symbol list once subscription
  // management (Fase 3) exists. Hardcoded here only for early bring-up.
  private readonly symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
  private readonly marketType: MarketType = 'spot';

  constructor(
    @Inject(EXCHANGE_ADAPTER)
    private readonly exchangeAdapter: IExchangeAdapter,
    private readonly buffer: KlineBufferService,
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
