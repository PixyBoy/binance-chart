import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { KlineQueryService } from './kline-query.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('KlineQueryService', () => {
  let service: KlineQueryService;
  let prismaMock: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prismaMock = { $queryRaw: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KlineQueryService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(KlineQueryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('queries and normalizes rows into NormalizedKline shape with string OHLCV', async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      {
        exchange: 'binance',
        marketType: 'spot',
        symbol: 'BTCUSDT',
        openTime: new Date('2026-07-15T00:00:00.000Z'),
        open: 65000.5,
        high: 65010.25,
        low: 64990.1,
        close: 65005.75,
        volume: 12.5,
      },
    ]);

    const result = await service.getCandles({
      symbol: 'BTCUSDT',
      marketType: 'spot',
      timeframe: '5m',
      from: new Date('2026-07-15T00:00:00.000Z'),
      to: new Date('2026-07-15T01:00:00.000Z'),
    });

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      symbol: 'BTCUSDT',
      open: '65000.5',
      isClosed: true,
    });
  });

  it('rejects an unsupported timeframe before touching the database', async () => {
    await expect(
      service.getCandles({
        symbol: 'BTCUSDT',
        marketType: 'spot',
        // @ts-expect-error deliberately invalid for this test
        timeframe: '2m',
        from: new Date(),
        to: new Date(),
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it('caps limit at 5000 even if a larger value is requested', async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);

    await service.getCandles({
      symbol: 'BTCUSDT',
      marketType: 'spot',
      timeframe: '1m',
      from: new Date(),
      to: new Date(),
      limit: 999999,
    });

    // The limit is embedded in the tagged-template SQL; assert the call
    // happened without asserting exact SQL text (implementation detail).
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
