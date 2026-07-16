import { Module } from '@nestjs/common';
import { CHART_FORMATTER } from './chart-formatter.interface';
import { KlineQueryService } from './kline-query.service';
import { LightweightChartsFormatterService } from './lightweight-charts-formatter.service';
import { KlinesController } from './klines.controller';
import { ChartGateway } from './chart.gateway';

/**
 * The only place that binds the chart output format to a concrete
 * implementation. Switching from lightweight-charts to a TradingView
 * Charting Library UDF response later means adding a new formatter class
 * and changing only the `useClass` line below.
 */
@Module({
  providers: [
    KlineQueryService,
    LightweightChartsFormatterService,
    {
      provide: CHART_FORMATTER,
      useClass: LightweightChartsFormatterService,
    },
    ChartGateway,
  ],
  controllers: [KlinesController],
})
export class ChartingModule {}
