import { Test, TestingModule } from '@nestjs/testing';
import { EXCHANGE_ADAPTER } from '@trading-backend/exchange-adapters';
import { KlineIngestionService } from './kline-ingestion.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('KlineIngestionService', () => {
  let service: KlineIngestionService;
  let prismaMock: {
    kline1m: { upsert: jest.Mock };
    ingestionCursor: { upsert: jest.Mock };
  };

  const baseKline = {
    exchange: 'binance',
    marketType: 'spot' as const,
    symbol: 'BTCUSDT',
    openTime: new Date('2026-07-15T00:00:00.000Z'),
    closeTime: new Date('2026-07-15T00:01:00.000Z'),
    open: '65000.00',
    high: '65010.00',
    low: '64990.00',
    close: '65005.00',
    volume: '12.5',
  };

  beforeEach(async () => {
    prismaMock = {
      kline1m: { upsert: jest.fn() },
      ingestionCursor: { upsert: jest.fn() },
    };

    const exchangeAdapterMock = {
      connectStream: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KlineIngestionService,
        { provide: EXCHANGE_ADAPTER, useValue: exchangeAdapterMock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<KlineIngestionService>(KlineIngestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('persists a closed candle and updates the ingestion cursor', async () => {
    await (service as any).persistKline({ ...baseKline, isClosed: true });

    expect(prismaMock.kline1m.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.ingestionCursor.upsert).toHaveBeenCalledTimes(1);

    const upsertArg = prismaMock.kline1m.upsert.mock.calls[0][0];
    expect(upsertArg.create.symbol).toBe('BTCUSDT');
    expect(upsertArg.create.close).toBe('65005.00');
  });

  it('does NOT persist a still-forming (unclosed) candle', async () => {
    await (service as any).persistKline({ ...baseKline, isClosed: false });

    expect(prismaMock.kline1m.upsert).not.toHaveBeenCalled();
    expect(prismaMock.ingestionCursor.upsert).not.toHaveBeenCalled();
  });
});
