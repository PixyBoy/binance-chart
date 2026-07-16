/**
 * Exchange-agnostic market data contracts.
 * Every exchange adapter (Binance, and any future exchange) must produce
 * data in these shapes so the rest of the system never depends on a
 * specific exchange's wire format.
 */

export type MarketType = 'spot' | 'futures';

/** A single normalized OHLCV candle at the base 1-minute resolution. */
export interface NormalizedKline {
  exchange: string; // e.g. 'binance'
  marketType: MarketType;
  symbol: string; // e.g. 'BTCUSDT'
  openTime: Date; // candle open time (UTC)
  closeTime: Date; // candle close time (UTC)
  open: string; // decimal-safe string, never a float
  high: string;
  low: string;
  close: string;
  volume: string;
  isClosed: boolean; // false = still-forming candle (last partial update)
}

/** A single price level in an order book snapshot. */
export interface OrderBookLevel {
  price: string;
  quantity: string;
}

/** Partial order book snapshot (top-N levels only, not full depth). */
export interface NormalizedOrderBook {
  exchange: string;
  marketType: MarketType;
  symbol: string;
  timestamp: Date;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface SymbolInfo {
  exchange: string;
  marketType: MarketType;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  isTradingEnabled: boolean;
}

export type MarketEvent =
  | { type: 'kline'; payload: NormalizedKline }
  | { type: 'orderbook'; payload: NormalizedOrderBook };

export type OrderBookEvent = {
  type: 'orderbook';
  payload: NormalizedOrderBook;
};

/** Current known state of an exchange's rate limit budget. */
export interface RateLimitState {
  exchange: string;
  usedWeight: number;
  limitWeight: number;
  windowResetAt: Date;
}

export interface StreamSubscription {
  marketType: MarketType;
  symbols: string[];
  channels: Array<'kline_1m' | 'orderbook'>;
}
