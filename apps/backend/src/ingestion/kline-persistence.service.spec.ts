import { Test, TestingModule } from '@nestjs/testing';
import { KlinePersistenceService } from './kline-persistence.service';
import { PrismaService } from '../common/prisma/prisma.service';
import type { NormalizedKline } from '@trading-backend/exchange-adapters';

describe('KlinePersistenceService', () => {
  let service: KlinePersistenceService;
  let prismaMock: {
    kline1m: { upsert: jest.Mock };
    ingestionCursor: { upsert: jest.Mock };
  };

  const baseKline: NormalizedKline = {
    exchange: 'binance',
    marketType: 'spot',
    symbol: 'BTCUSDT',
    openTime: new Date('2026-07-15T00:00:00.000Z'),
    closeTime: new Date('2026-07-15T00:01:00.000Z'),
    open: '65000.00',
    high: '65010.00',
    low: '64990.00',
    close: '65005.00',
    volume: '12.5',
    isClosed: true,
  };

  beforeEach(async () => {
    prismaMock = {
      kline1m: { upsert: jest.fn() },
      ingestionCursor: { upsert: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KlinePersistenceService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<KlinePersistenceService>(KlinePersistenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('persists a closed candle and advances the ingestion cursor', async () => {
    await service.persistKline(baseKline);

    expect(prismaMock.kline1m.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.ingestionCursor.upsert).toHaveBeenCalledTimes(1);

    const cursorArg = prismaMock.ingestionCursor.upsert.mock.calls[0][0];
    expect(cursorArg.update.lastCloseTime).toEqual(baseKline.closeTime);
  });

  it('does NOT persist a still-forming (unclosed) candle', async () => {
    await service.persistKline({ ...baseKline, isClosed: false });

    expect(prismaMock.kline1m.upsert).not.toHaveBeenCalled();
    expect(prismaMock.ingestionCursor.upsert).not.toHaveBeenCalled();
  });
});
