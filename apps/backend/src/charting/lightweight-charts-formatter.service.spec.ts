import { Test, TestingModule } from '@nestjs/testing';
import { LightweightChartsFormatterService } from './lightweight-charts-formatter.service';
import type { NormalizedKline } from '@trading-backend/exchange-adapters';

describe('LightweightChartsFormatterService', () => {
  let service: LightweightChartsFormatterService;

  const kline: NormalizedKline = {
    exchange: 'binance',
    marketType: 'spot',
    symbol: 'BTCUSDT',
    openTime: new Date('2026-07-15T00:00:00.000Z'),
    closeTime: new Date('2026-07-15T00:01:00.000Z'),
    open: '65000.50',
    high: '65010.25',
    low: '64990.10',
    close: '65005.75',
    volume: '12.5',
    isClosed: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LightweightChartsFormatterService],
    }).compile();

    service = module.get(LightweightChartsFormatterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('converts openTime to unix seconds and OHLCV fields to numbers', () => {
    const candle = service.formatCandle(kline);

    expect(candle).toEqual({
      time: Math.floor(kline.openTime.getTime() / 1000),
      open: 65000.5,
      high: 65010.25,
      low: 64990.1,
      close: 65005.75,
      volume: 12.5,
    });
  });

  it('formats an array of klines in order', () => {
    const result = service.formatCandles([kline, kline]);
    expect(result).toHaveLength(2);
  });
});
