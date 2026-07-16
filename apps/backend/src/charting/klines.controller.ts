import { Controller, Get, Inject, Query } from '@nestjs/common';
import { CHART_FORMATTER } from './chart-formatter.interface';
import type { IChartDataFormatter } from './chart-formatter.interface';
import { KlineQueryService } from './kline-query.service';
import { GetKlinesQueryDto } from './dto/get-klines.dto';

/**
 * Historical candle data for a chart's initial load. Live updates after
 * that come from ChartGateway (WebSocket), not this endpoint.
 */
@Controller('klines')
export class KlinesController {
  constructor(
    private readonly klineQuery: KlineQueryService,
    @Inject(CHART_FORMATTER) private readonly formatter: IChartDataFormatter,
  ) {}

  @Get()
  async getKlines(@Query() query: GetKlinesQueryDto) {
    const klines = await this.klineQuery.getCandles({
      symbol: query.symbol,
      marketType: query.marketType,
      timeframe: query.timeframe,
      from: query.from,
      to: query.to,
      limit: query.limit,
    });

    return this.formatter.formatCandles(klines);
  }
}
