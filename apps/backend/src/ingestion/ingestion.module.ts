import { Module } from '@nestjs/common';
import { EXCHANGE_ADAPTER } from '@trading-backend/exchange-adapters';
import { BinanceAdapterService } from './binance-adapter.service';
import { KlineIngestionService } from './kline-ingestion.service';

/**
 * The only place in the app that binds an interface (EXCHANGE_ADAPTER) to
 * a concrete implementation (BinanceAdapterService). Swapping or adding an
 * exchange later means changing only this `useClass` line (or making it
 * config-driven), not touching KlineIngestionService or anything downstream.
 */
@Module({
  providers: [
    BinanceAdapterService,
    {
      provide: EXCHANGE_ADAPTER,
      useClass: BinanceAdapterService,
    },
    KlineIngestionService,
  ],
  exports: [EXCHANGE_ADAPTER],
})
export class IngestionModule {}
