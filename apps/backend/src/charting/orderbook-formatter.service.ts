import { Injectable } from '@nestjs/common';
import type { NormalizedOrderBook } from '@trading-backend/exchange-adapters';

/**
 * Formats order book for delivery to clients. Currently matches the shape
 * Binance sends; can be abstracted with an interface later if needed.
 */
export interface FormattedOrderBook {
  symbol: string;
  timestamp: number; // unix ms
  bids: Array<{ price: string; quantity: string }>;
  asks: Array<{ price: string; quantity: string }>;
}

@Injectable()
export class OrderbookFormatterService {
  format(ob: NormalizedOrderBook): FormattedOrderBook {
    return {
      symbol: ob.symbol,
      timestamp: ob.timestamp.getTime(),
      bids: ob.bids.slice(0, 20),
      asks: ob.asks.slice(0, 20),
    };
  }
}
