import {
  MarketEvent,
  RateLimitState,
  StreamSubscription,
  SymbolInfo,
} from './types';
import type { OrderBookEvent } from './types';

/**
 * Contract every exchange integration (Binance today, others later) must
 * implement. Nothing outside an adapter implementation should ever import
 * an exchange-specific SDK or know an exchange-specific wire format.
 *
 * Swapping or adding an exchange = writing a new class that implements
 * this interface + registering it behind the EXCHANGE_ADAPTER DI token
 * in the backend app. No other module should need to change.
 */
export interface IExchangeAdapter {
  /** Stable machine-readable id, e.g. 'binance'. */
  readonly exchangeId: string;

  /**
   * Opens (or reuses) a live connection and starts emitting normalized
   * market events for the requested subscription. Must handle its own
   * reconnect/backoff internally and never throw on transient network
   * errors — connection health is exposed via isConnected()/events
   * instead of exceptions.
   */
  connectStream(subscription: StreamSubscription): AsyncIterable<MarketEvent>;

  /**
   * Opens (or reuses) a live connection and starts emitting normalized
   * order book events (depth snapshots). Independent from connectStream().
   * Binance sends depth updates at ~1000ms intervals (@depth20 stream).
   */
  connectOrderBookStream(
    subscription: StreamSubscription,
  ): AsyncIterable<OrderBookEvent>;

  /** Gracefully closes the underlying connection(s). */
  disconnect(): Promise<void>;

  /** True if the underlying stream connection is currently live. */
  isConnected(): boolean;

  /** Full tradable symbol list for a market type (used for backfill/discovery). */
  fetchExchangeInfo(marketType: StreamSubscription['marketType']): Promise<SymbolInfo[]>;

  /**
   * Historical kline fetch for backfill / gap-filling after a disconnect.
   * Must internally respect the exchange's own rate limits.
   */
  fetchHistoricalKlines(params: {
    marketType: StreamSubscription['marketType'];
    symbol: string;
    startTime: Date;
    endTime: Date;
  }): Promise<MarketEvent[]>;

  /** Current rate-limit budget usage, for monitoring + internal throttling. */
  getRateLimitState(): RateLimitState;
}

/** DI token used to inject whichever adapter is currently active. */
export const EXCHANGE_ADAPTER = Symbol('EXCHANGE_ADAPTER');
