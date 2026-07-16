import { Test, TestingModule } from '@nestjs/testing';
import {
  OrderbookPublisherService,
  obChannel,
} from './orderbook-publisher.service';
import { REDIS_CLIENT } from '../common/redis/redis.constants';
import type { NormalizedOrderBook } from '@trading-backend/exchange-adapters';

describe('OrderbookPublisherService', () => {
  let service: OrderbookPublisherService;
  let redisMock: { publish: jest.Mock };

  const orderbook: NormalizedOrderBook = {
    exchange: 'binance',
    marketType: 'spot',
    symbol: 'BTCUSDT',
    timestamp: new Date(),
    bids: [{ price: '65000', quantity: '1' }],
    asks: [{ price: '65001', quantity: '1' }],
  };

  beforeEach(async () => {
    redisMock = { publish: jest.fn().mockResolvedValue(1) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderbookPublisherService,
        { provide: REDIS_CLIENT, useValue: redisMock },
      ],
    }).compile();

    service = module.get<OrderbookPublisherService>(OrderbookPublisherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('publishes order book to the correct Redis channel', async () => {
    await service.publish(orderbook);

    expect(redisMock.publish).toHaveBeenCalledWith(
      obChannel('binance', 'spot', 'BTCUSDT'),
      expect.any(String),
    );
  });

  it('does not throw when publish fails (best-effort)', async () => {
    redisMock.publish.mockRejectedValueOnce(new Error('redis down'));

    await expect(service.publish(orderbook)).resolves.toBeUndefined();
  });
});
