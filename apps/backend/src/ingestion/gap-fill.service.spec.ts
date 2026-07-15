import { Test, TestingModule } from '@nestjs/testing';
import { GapFillService } from './gap-fill.service';
import { EXCHANGE_ADAPTER } from '@trading-backend/exchange-adapters';
import { PrismaService } from '../common/prisma/prisma.service';
import { KlineBufferService } from './kline-buffer.service';

describe('GapFillService', () => {
  let service: GapFillService;
  let exchangeAdapterMock: { fetchHistoricalKlines: jest.Mock };
  let prismaMock: { ingestionCursor: { findUnique: jest.Mock } };
  let bufferMock: { push: jest.Mock };

  beforeEach(async () => {
    exchangeAdapterMock = { fetchHistoricalKlines: jest.fn() };
    prismaMock = { ingestionCursor: { findUnique: jest.fn() } };
    bufferMock = { push: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GapFillService,
        { provide: EXCHANGE_ADAPTER, useValue: exchangeAdapterMock },
        { provide: PrismaService, useValue: prismaMock },
        { provide: KlineBufferService, useValue: bufferMock },
      ],
    }).compile();

    service = module.get<GapFillService>(GapFillService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does nothing on the first-ever connect (wasReconnect=false)', async () => {
    await service.handleReconnected({
      marketType: 'spot',
      symbols: ['BTCUSDT'],
      wasReconnect: false,
    });

    expect(prismaMock.ingestionCursor.findUnique).not.toHaveBeenCalled();
  });

  it('does nothing for a symbol with no prior cursor', async () => {
    prismaMock.ingestionCursor.findUnique.mockResolvedValue(null);

    await service.handleReconnected({
      marketType: 'spot',
      symbols: ['BTCUSDT'],
      wasReconnect: true,
    });

    expect(exchangeAdapterMock.fetchHistoricalKlines).not.toHaveBeenCalled();
  });

  it('fetches and buffers the gap between the last cursor and now on reconnect', async () => {
    const lastCloseTime = new Date(Date.now() - 5 * 60_000); // 5 min ago
    prismaMock.ingestionCursor.findUnique.mockResolvedValue({ lastCloseTime });

    const recovered = [
      { type: 'kline', payload: { symbol: 'BTCUSDT' } },
      { type: 'kline', payload: { symbol: 'BTCUSDT' } },
    ];
    exchangeAdapterMock.fetchHistoricalKlines.mockResolvedValue(recovered);

    await service.handleReconnected({
      marketType: 'spot',
      symbols: ['BTCUSDT'],
      wasReconnect: true,
    });

    expect(exchangeAdapterMock.fetchHistoricalKlines).toHaveBeenCalledWith(
      expect.objectContaining({ marketType: 'spot', symbol: 'BTCUSDT' }),
    );
    expect(bufferMock.push).toHaveBeenCalledTimes(2);
  });

  it('does not call fetchHistoricalKlines when there is no gap', async () => {
    prismaMock.ingestionCursor.findUnique.mockResolvedValue({
      lastCloseTime: new Date(Date.now() + 60_000), // in the future -> no gap
    });

    await service.handleReconnected({
      marketType: 'spot',
      symbols: ['BTCUSDT'],
      wasReconnect: true,
    });

    expect(exchangeAdapterMock.fetchHistoricalKlines).not.toHaveBeenCalled();
  });
});
