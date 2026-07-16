import { Test, TestingModule } from '@nestjs/testing';
import { OrderbookSnapshotService } from './orderbook-snapshot.service';
import { REDIS_CLIENT } from '../common/redis/redis.constants';
import type { NormalizedOrderBook } from '@trading-backend/exchange-adapters';

describe('OrderbookSnapshotService', () => {
  let service: OrderbookSnapshotService;
  let redisMock: { setex: jest.Mock; get: jest.Mock };

  const orderbook: NormalizedOrderBook = {
    exchange: 'binance',
    marketType: 'spot',
    symbol: 'BTCUSDT',
    timestamp: new Date(),
    bids: [{ price: '1', quantity: '1' }],
    asks: [{ price: '2', quantity: '1' }],
  };

  beforeEach(async () => {
    redisMock = {
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderbookSnapshotService,
        { provide: REDIS_CLIENT, useValue: redisMock },
      ],
    }).compile();

    service = module.get<OrderbookSnapshotService>(OrderbookSnapshotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('saves order book to Redis with 5min TTL', async () => {
    await service.save(orderbook);

    expect(redisMock.setex).toHaveBeenCalledWith(
      'ob:binance:spot:BTCUSDT',
      300,
      expect.any(String),
    );
  });

  it('retrieves and parses order book from Redis', async () => {
    const json = JSON.stringify(orderbook);
    redisMock.get.mockResolvedValueOnce(json);

    const result = await service.get('binance', 'spot', 'BTCUSDT');

    expect(result).toMatchObject({
      symbol: 'BTCUSDT',
      bids: orderbook.bids,
      asks: orderbook.asks,
    });
  });

  it('returns null when Redis has no snapshot', async () => {
    const result = await service.get('binance', 'spot', 'UNKNOWN');
    expect(result).toBeNull();
  });
});
