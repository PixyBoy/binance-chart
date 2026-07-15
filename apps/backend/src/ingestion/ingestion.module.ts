import { Module } from '@nestjs/common';
import { EXCHANGE_ADAPTER } from '@trading-backend/exchange-adapters';
import { BinanceAdapterService } from './binance-adapter.service';
import { KlineIngestionService } from './kline-ingestion.service';
import { KlineBufferService } from './kline-buffer.service';
import { KlinePersistenceService } from './kline-persistence.service';
import { KlineStreamConsumerService } from './kline-stream-consumer.service';
import { GapFillService } from './gap-fill.service';

/**
 * The only place in the app that binds an interface (EXCHANGE_ADAPTER) to
 * a concrete implementation (BinanceAdapterService). Swapping or adding an
 * exchange later means changing only this `useClass` line (or making it
 * config-driven), not touching anything else in this module.
 *
 * Data flow: BinanceAdapterService --stream--> KlineIngestionService
 *   --push--> KlineBufferService (Redis Stream, durable)
 *   --consume--> KlineStreamConsumerService --> KlinePersistenceService --> Postgres
 * GapFillService listens for reconnect events and feeds recovered candles
 * into the same KlineBufferService, so live and backfilled data share one
 * persistence path.
 */
@Module({
  providers: [
    BinanceAdapterService,
    {
      provide: EXCHANGE_ADAPTER,
      useClass: BinanceAdapterService,
    },
    KlineIngestionService,
    KlineBufferService,
    KlinePersistenceService,
    KlineStreamConsumerService,
    GapFillService,
  ],
  exports: [EXCHANGE_ADAPTER],
})
export class IngestionModule {}
