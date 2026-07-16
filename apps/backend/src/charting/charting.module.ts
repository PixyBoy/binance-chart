import { Module } from '@nestjs/common';
import { IngestionModule } from '../ingestion/ingestion.module';
import { CHART_FORMATTER } from './chart-formatter.interface';
import { KlineQueryService } from './kline-query.service';
import { LightweightChartsFormatterService } from './lightweight-charts-formatter.service';
import { KlinesController } from './klines.controller';
import { ChartGateway } from './chart.gateway';
import { OrderbookFormatterService } from './orderbook-formatter.service';
import { OrderbookGateway } from './orderbook.gateway';

/**
 * The charting layer with format adapters for multiple chart libraries and
 * real-time WebSocket gateways for both klines and order books.
 */
@Module({
  imports: [IngestionModule],
  providers: [
    KlineQueryService,
    LightweightChartsFormatterService,
    {
      provide: CHART_FORMATTER,
      useClass: LightweightChartsFormatterService,
    },
    ChartGateway,
    OrderbookFormatterService,
    OrderbookGateway,
  ],
  controllers: [KlinesController],
})
export class ChartingModule {}
