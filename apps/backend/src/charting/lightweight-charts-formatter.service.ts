import { Injectable } from '@nestjs/common';
import type { NormalizedKline } from '@trading-backend/exchange-adapters';
import { ChartCandle, IChartDataFormatter } from './chart-formatter.interface';

/**
 * Default (and currently only) formatter, matching the shape
 * lightweight-charts expects: { time, open, high, low, close }, with
 * `time` as unix SECONDS (not milliseconds) and numeric OHLCV values.
 * If the frontend switches to TradingView's Charting Library later, add
 * a TradingViewUdfFormatter implementing the same interface and swap the
 * `useClass` binding in charting.module.ts — nothing else changes.
 */
@Injectable()
export class LightweightChartsFormatterService implements IChartDataFormatter {
  readonly id = 'lightweight-charts';

  formatCandle(kline: NormalizedKline): ChartCandle {
    return {
      time: Math.floor(kline.openTime.getTime() / 1000),
      open: Number(kline.open),
      high: Number(kline.high),
      low: Number(kline.low),
      close: Number(kline.close),
      volume: Number(kline.volume),
    };
  }

  formatCandles(klines: NormalizedKline[]): ChartCandle[] {
    return klines.map((k) => this.formatCandle(k));
  }
}
