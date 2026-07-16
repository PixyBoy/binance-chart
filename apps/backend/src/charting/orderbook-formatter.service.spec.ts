import { Test, TestingModule } from '@nestjs/testing';
import { OrderbookFormatterService } from './orderbook-formatter.service';
import type { NormalizedOrderBook } from '@trading-backend/exchange-adapters';

describe('OrderbookFormatterService', () => {
  let service: OrderbookFormatterService;

  const orderbook: NormalizedOrderBook = {
    exchange: 'binance',
    marketType: 'spot',
    symbol: 'BTCUSDT',
    timestamp: new Date('2026-07-16T00:00:00.000Z'),
    bids: [
      { price: '65000.50', quantity: '1.5' },
      { price: '65000.00', quantity: '2.0' },
    ],
    asks: [
      { price: '65001.00', quantity: '1.0' },
      { price: '65002.00', quantity: '2.5' },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderbookFormatterService],
    }).compile();

    service = module.get<OrderbookFormatterService>(OrderbookFormatterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('converts timestamp to unix milliseconds and preserves bids/asks', () => {
    const formatted = service.format(orderbook);

    expect(formatted.symbol).toBe('BTCUSDT');
    expect(formatted.timestamp).toBe(orderbook.timestamp.getTime());
    expect(formatted.bids).toEqual(orderbook.bids);
    expect(formatted.asks).toEqual(orderbook.asks);
  });
});
