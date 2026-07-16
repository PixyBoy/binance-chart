import type { NormalizedKline } from '@trading-backend/exchange-adapters';

/**
 * Chart-library-agnostic candle shape. Every formatter converts our
 * internal NormalizedKline into whatever shape a specific charting
 * library expects. Adding TradingView support later means adding one
 * new class here — nothing else in the app (query logic, REST route,
 * WebSocket gateway) needs to change.
 */
export interface ChartCandle {
  time: number; // unix seconds — lightweight-charts convention
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IChartDataFormatter {
  readonly id: string;
  formatCandle(kline: NormalizedKline): ChartCandle;
  formatCandles(klines: NormalizedKline[]): ChartCandle[];
}

/** DI token so the active formatter can be swapped in one place. */
export const CHART_FORMATTER = Symbol('CHART_FORMATTER');
