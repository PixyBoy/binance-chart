import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EXCHANGE_ADAPTER } from '@trading-backend/exchange-adapters';
import type { IExchangeAdapter } from '@trading-backend/exchange-adapters';

import { PrismaService } from '../common/prisma/prisma.service';
import { KlineBufferService } from './kline-buffer.service';
import {
  BINANCE_RECONNECTED_EVENT,
  type BinanceConnectionEventPayload,
} from './binance-adapter.service';

/**
 * Guarantees "zero data loss" across a Binance disconnect: whenever the
 * adapter reconnects, this fetches every 1m candle between the last
 * successfully persisted candle (IngestionCursor) and now, and pushes it
 * through the SAME durable buffer as live data — so a gap-filled candle
 * gets identical at-least-once persistence guarantees as a live one.
 */
@Injectable()
export class GapFillService {
  private readonly logger = new Logger(GapFillService.name);

  constructor(
    @Inject(EXCHANGE_ADAPTER)
    private readonly exchangeAdapter: IExchangeAdapter,
    private readonly prisma: PrismaService,
    private readonly buffer: KlineBufferService,
  ) {}

  @OnEvent(BINANCE_RECONNECTED_EVENT)
  async handleReconnected(
    payload: BinanceConnectionEventPayload,
  ): Promise<void> {
    if (!payload.wasReconnect) {
      return; // first-ever connect — nothing to backfill yet
    }

    for (const symbol of payload.symbols) {
      await this.backfillSymbol(payload.marketType, symbol).catch((err) => {
        this.logger.error(
          `Gap-fill failed for ${symbol}; will retry on next reconnect`,
          err as Error,
        );
      });
    }
  }

  private async backfillSymbol(
    marketType: BinanceConnectionEventPayload['marketType'],
    symbol: string,
  ): Promise<void> {
    const cursor = await this.prisma.ingestionCursor.findUnique({
      where: {
        exchange_marketType_symbol: {
          exchange: 'binance',
          marketType: marketType,
          symbol,
        },
      },
    });

    // No prior cursor means this symbol has never ingested a candle yet —
    // full historical backfill is a separate, explicit operation, not
    // triggered implicitly by a reconnect.
    if (!cursor) return;

    const startTime = new Date(cursor.lastCloseTime.getTime() + 1);
    const endTime = new Date();

    if (startTime >= endTime) return; // no gap

    this.logger.warn(
      `Backfilling gap for ${symbol}: ${startTime.toISOString()} -> ${endTime.toISOString()}`,
    );

    const events = await this.exchangeAdapter.fetchHistoricalKlines({
      marketType,
      symbol,
      startTime,
      endTime,
    });

    for (const event of events) {
      await this.buffer.push(event);
    }

    this.logger.log(
      `Gap-fill for ${symbol} queued ${events.length} candle(s) for persistence`,
    );
  }
}
