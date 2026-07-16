import { Test, TestingModule } from '@nestjs/testing';
import { KlinesController } from './klines.controller';
import { KlineQueryService } from './kline-query.service';
import { CHART_FORMATTER } from './chart-formatter.interface';

describe('KlinesController', () => {
  let controller: KlinesController;
  let klineQueryMock: { getCandles: jest.Mock };
  let formatterMock: { formatCandles: jest.Mock };

  beforeEach(async () => {
    klineQueryMock = {
      getCandles: jest.fn().mockResolvedValue([{ symbol: 'BTCUSDT' }]),
    };
    formatterMock = {
      formatCandles: jest.fn().mockReturnValue([{ time: 1, open: 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KlinesController],
      providers: [
        { provide: KlineQueryService, useValue: klineQueryMock },
        { provide: CHART_FORMATTER, useValue: formatterMock },
      ],
    }).compile();

    controller = module.get<KlinesController>(KlinesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('queries candles then formats them through the active formatter', async () => {
    const query = {
      symbol: 'BTCUSDT',
      marketType: 'spot' as const,
      timeframe: '5m' as const,
      from: new Date('2026-07-15T00:00:00.000Z'),
      to: new Date('2026-07-15T01:00:00.000Z'),
    };

    const result = await controller.getKlines(query);

    expect(klineQueryMock.getCandles).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'BTCUSDT', timeframe: '5m' }),
    );
    expect(formatterMock.formatCandles).toHaveBeenCalledWith([
      { symbol: 'BTCUSDT' },
    ]);
    expect(result).toEqual([{ time: 1, open: 1 }]);
  });
});
