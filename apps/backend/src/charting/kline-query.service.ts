import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  MarketType,
  NormalizedKline,
} from '@trading-backend/exchange-adapters';
import { PrismaService } from '../common/prisma/prisma.service';

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

/** Every supported timeframe maps to exactly one source: the raw 1m table,
 * or one of the TimescaleDB continuous aggregate views created in Fase 1.
 * This allow-list is also what keeps the table name safe to interpolate
 * into raw SQL below — it is never built from unvalidated user input. */
const TIMEFRAME_TABLE: Record<Timeframe, string> = {
  '1m': 'kline_1m',
  '5m': 'kline_5m',
  '15m': 'kline_15m',
  '1h': 'kline_1h',
  '4h': 'kline_4h',
  '1d': 'kline_1d',
};

interface RawRow {
  exchange: string;
  marketType: MarketType;
  symbol: string;
  openTime: Date;
  open: string | number;
  high: string | number;
  low: string | number;
  close: string | number;
  volume: string | number;
}

@Injectable()
export class KlineQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getCandles(params: {
    symbol: string;
    marketType: MarketType;
    timeframe: Timeframe;
    from: Date;
    to: Date;
    limit?: number;
  }): Promise<NormalizedKline[]> {
    const table = TIMEFRAME_TABLE[params.timeframe];
    if (!table) {
      throw new BadRequestException(
        `Unsupported timeframe: ${params.timeframe}`,
      );
    }

    const limit = Math.min(params.limit ?? 1000, 5000);

    // Continuous aggregate views aren't Prisma models (Prisma has no
    // concept of them), so this is a raw query. Prisma.sql parameterizes
    // every value; only the table name is interpolated, and it comes
    // exclusively from the TIMEFRAME_TABLE allow-list above, never from
    // the request directly.
    const rows = await this.prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT exchange, "marketType", symbol, "openTime", open, high, low, close, volume
      FROM ${Prisma.raw(table)}
      WHERE exchange = 'binance'
        AND "marketType" = ${params.marketType}::"MarketType"
        AND symbol = ${params.symbol}
        AND "openTime" >= ${params.from}
        AND "openTime" <= ${params.to}
      ORDER BY "openTime" ASC
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      exchange: row.exchange,
      marketType: row.marketType,
      symbol: row.symbol,
      openTime: row.openTime,
      // Continuous aggregates don't track a separate closeTime; derive it
      // from the next bucket boundary isn't needed for chart rendering,
      // so we reuse openTime — formatters only use `time` (openTime).
      closeTime: row.openTime,
      open: String(row.open),
      high: String(row.high),
      low: String(row.low),
      close: String(row.close),
      volume: String(row.volume),
      isClosed: true,
    }));
  }
}
