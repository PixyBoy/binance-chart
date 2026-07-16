import { Test, TestingModule } from '@nestjs/testing';
import {
  LiveKlinePublisherService,
  liveKlineChannel,
} from './live-kline-publisher.service';
import { REDIS_CLIENT } from '../common/redis/redis.constants';

describe('LiveKlinePublisherService', () => {
  let service: LiveKlinePublisherService;
  let redisMock: { publish: jest.Mock };

  const kline = {
    exchange: 'binance',
    marketType: 'spot' as const,
    symbol: 'BTCUSDT',
    openTime: new Date(),
    closeTime: new Date(),
    open: '1',
    high: '1',
    low: '1',
    close: '1',
    volume: '1',
    isClosed: false, // forming candle — live publish must NOT filter these out
  };

  beforeEach(async () => {
    redisMock = { publish: jest.fn().mockResolvedValue(1) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveKlinePublisherService,
        { provide: REDIS_CLIENT, useValue: redisMock },
      ],
    }).compile();

    service = module.get(LiveKlinePublisherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('publishes both closed and still-forming candles to the live channel', async () => {
    await service.publish({ type: 'kline', payload: kline });

    expect(redisMock.publish).toHaveBeenCalledWith(
      liveKlineChannel('binance', 'spot', 'BTCUSDT'),
      expect.any(String),
    );
  });

  it('ignores non-kline events', async () => {
    await service.publish({ type: 'orderbook', payload: {} as any });
    expect(redisMock.publish).not.toHaveBeenCalled();
  });

  it('does not throw when Redis publish fails (best-effort delivery)', async () => {
    redisMock.publish.mockRejectedValue(new Error('redis down'));

    await expect(
      service.publish({ type: 'kline', payload: kline }),
    ).resolves.toBeUndefined();
  });
});
