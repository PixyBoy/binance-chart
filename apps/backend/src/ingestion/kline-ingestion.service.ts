import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EXCHANGE_ADAPTER } from '@trading-backend/exchange-adapters';
import type {
  IExchangeAdapter,
  MarketType,
} from '@trading-backend/exchange-adapters';
import { PrismaService } from '../common/prisma/prisma.service';
import { MarketType as PrismaMarketType } from '@prisma/client';

/**
 * Fase 1 scope: subscribe to 1m klines for the configured symbols,
 * persist every closed candle to TimescaleDB, and track a per-symbol
 * ingestion cursor. Buffering through Redis Streams for guaranteed
 * delivery and reconnect gap-filling are added in Fase 2 — this service
 * intentionally does the simplest correct thing first.
 */
@Injectable()
export class KlineIngestionService implements OnModuleInit {
  private readonly logger = new Logger(KlineIngestionService.name);

  // TODO: move to config/DB-driven symbol list once subscription
  // management (Fase 3) exists. Hardcoded here only for Fase 1 bring-up.
  private readonly symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
  private readonly marketType: MarketType = 'spot';

  constructor(
    @Inject(EXCHANGE_ADAPTER)
    private readonly exchangeAdapter: IExchangeAdapter,
    private readonly prisma: PrismaService,
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
      if (event.type !== 'kline') continue;

      try {
        await this.persistKline(event.payload);
      } catch (err) {
        this.logger.error(
          `Failed to persist kline for ${event.payload.symbol}`,
          err as Error,
        );
      }
    }
  }

  private async persistKline(
    kline: Extract<
      Awaited<ReturnType<IExchangeAdapter['fetchHistoricalKlines']>>[number],
      { type: 'kline' }
    >['payload'],
  ): Promise<void> {
    // Only persist closed candles — the still-forming candle (isClosed:
    // false) is for live chart preview only and is pushed straight to
    // subscribers via Redis Pub/Sub in Fase 3, never written to storage.
    if (!kline.isClosed) {
      return;
    }

    await this.prisma.kline1m.upsert({
      where: {
        exchange_marketType_symbol_openTime: {
          exchange: kline.exchange,
          marketType: kline.marketType as PrismaMarketType,
          symbol: kline.symbol,
          openTime: kline.openTime,
        },
      },
      create: {
        exchange: kline.exchange,
        marketType: kline.marketType as PrismaMarketType,
        symbol: kline.symbol,
        openTime: kline.openTime,
        closeTime: kline.closeTime,
        open: kline.open,
        high: kline.high,
        low: kline.low,
        close: kline.close,
        volume: kline.volume,
        isClosed: true,
      },
      update: {
        closeTime: kline.closeTime,
        open: kline.open,
        high: kline.high,
        low: kline.low,
        close: kline.close,
        volume: kline.volume,
      },
    });

    await this.prisma.ingestionCursor.upsert({
      where: {
        exchange_marketType_symbol: {
          exchange: kline.exchange,
          marketType: kline.marketType as PrismaMarketType,
          symbol: kline.symbol,
        },
      },
      create: {
        exchange: kline.exchange,
        marketType: kline.marketType as PrismaMarketType,
        symbol: kline.symbol,
        lastCloseTime: kline.closeTime,
      },
      update: {
        lastCloseTime: kline.closeTime,
      },
    });

    this.logger.debug(
      `Persisted ${kline.symbol} candle closing at ${kline.closeTime.toISOString()}`,
    );
  }
}
