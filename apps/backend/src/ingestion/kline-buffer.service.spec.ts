import { Test, TestingModule } from '@nestjs/testing';
import { KlineBufferService } from './kline-buffer.service';
import { REDIS_CLIENT } from '../common/redis/redis.constants';
import { KLINE_STREAM_KEY } from './kline-stream.constants';

describe('KlineBufferService', () => {
  let service: KlineBufferService;
  let redisMock: { xadd: jest.Mock };

  beforeEach(async () => {
    redisMock = { xadd: jest.fn().mockResolvedValue('1-1') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KlineBufferService,
        { provide: REDIS_CLIENT, useValue: redisMock },
      ],
    }).compile();

    service = module.get<KlineBufferService>(KlineBufferService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('XADDs kline events onto the durable stream', async () => {
    await service.push({
      type: 'kline',
      payload: {
        exchange: 'binance',
        marketType: 'spot',
        symbol: 'BTCUSDT',
        openTime: new Date(),
        closeTime: new Date(),
        open: '1',
        high: '1',
        low: '1',
        close: '1',
        volume: '1',
        isClosed: true,
      },
    });

    expect(redisMock.xadd).toHaveBeenCalledTimes(1);
    const args = redisMock.xadd.mock.calls[0];
    expect(args[0]).toBe(KLINE_STREAM_KEY);
  });

  it('ignores non-kline events (e.g. orderbook, added later)', async () => {
    await service.push({ type: 'orderbook', payload: {} as any });
    expect(redisMock.xadd).not.toHaveBeenCalled();
  });

  it('propagates and does not swallow a Redis failure', async () => {
    redisMock.xadd.mockRejectedValue(new Error('redis down'));

    await expect(
      service.push({
        type: 'kline',
        payload: {
          exchange: 'binance',
          marketType: 'spot',
          symbol: 'BTCUSDT',
          openTime: new Date(),
          closeTime: new Date(),
          open: '1',
          high: '1',
          low: '1',
          close: '1',
          volume: '1',
          isClosed: true,
        },
      }),
    ).rejects.toThrow('redis down');
  });
});
