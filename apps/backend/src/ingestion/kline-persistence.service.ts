import { Injectable, Logger } from '@nestjs/common';
import type { NormalizedKline } from '@trading-backend/exchange-adapters';
import { MarketType as PrismaMarketType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * The single place that writes klines to TimescaleDB. Used by both the
 * live-stream consumer worker and the gap-fill backfill path, so every
 * write — whether it arrived live or was recovered after a disconnect —
 * goes through identical, tested logic.
 */
@Injectable()
export class KlinePersistenceService {
  private readonly logger = new Logger(KlinePersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async persistKline(kline: NormalizedKline): Promise<void> {
    // Only closed candles are persisted — a still-forming candle is for
    // live chart preview only (pushed via Pub/Sub in Fase 3) and is never
    // written to storage, since it will be re-emitted (corrected) on
    // every tick until it closes.
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
