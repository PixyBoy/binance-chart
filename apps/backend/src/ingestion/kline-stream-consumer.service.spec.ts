import { Test, TestingModule } from '@nestjs/testing';
import { KlineStreamConsumerService } from './kline-stream-consumer.service';
import { KlinePersistenceService } from './kline-persistence.service';
import { REDIS_CLIENT } from '../common/redis/redis.constants';

describe('KlineStreamConsumerService', () => {
  let service: KlineStreamConsumerService;
  let redisMock: {
    xgroup: jest.Mock;
    xreadgroup: jest.Mock;
    xack: jest.Mock;
    xautoclaim: jest.Mock;
  };
  let persistenceMock: { persistKline: jest.Mock };

  beforeEach(async () => {
    redisMock = {
      xgroup: jest.fn().mockResolvedValue('OK'),
      xreadgroup: jest.fn(),
      xack: jest.fn().mockResolvedValue(1),
      xautoclaim: jest.fn().mockResolvedValue(['0-0', []]),
    };
    persistenceMock = { persistKline: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KlineStreamConsumerService,
        { provide: REDIS_CLIENT, useValue: redisMock },
        { provide: KlinePersistenceService, useValue: persistenceMock },
      ],
    }).compile();

    service = module.get<KlineStreamConsumerService>(
      KlineStreamConsumerService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('persists a stream entry and acknowledges it on success', async () => {
    const kline = {
      exchange: 'binance',
      marketType: 'spot',
      symbol: 'BTCUSDT',
      openTime: new Date().toISOString(),
      closeTime: new Date().toISOString(),
      open: '1',
      high: '1',
      low: '1',
      close: '1',
      volume: '1',
      isClosed: true,
    };

    await (service as any).handleEntry('1-1', [
      'payload',
      JSON.stringify(kline),
    ]);

    expect(persistenceMock.persistKline).toHaveBeenCalledTimes(1);
    expect(redisMock.xack).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      '1-1',
    );
  });

  it('does NOT acknowledge an entry that fails to persist (left pending for retry)', async () => {
    persistenceMock.persistKline.mockRejectedValueOnce(new Error('db down'));

    const kline = {
      exchange: 'binance',
      marketType: 'spot',
      symbol: 'BTCUSDT',
      openTime: new Date().toISOString(),
      closeTime: new Date().toISOString(),
      open: '1',
      high: '1',
      low: '1',
      close: '1',
      volume: '1',
      isClosed: true,
    };

    await (service as any).handleEntry('1-2', [
      'payload',
      JSON.stringify(kline),
    ]);

    expect(redisMock.xack).not.toHaveBeenCalled();
  });

  it('creates the consumer group on init and tolerates BUSYGROUP if it already exists', async () => {
    redisMock.xgroup.mockRejectedValueOnce(
      new Error('BUSYGROUP already exists'),
    );
    await expect(
      (service as any).ensureConsumerGroup(),
    ).resolves.toBeUndefined();
  });
});
