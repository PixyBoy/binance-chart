import { Module } from '@nestjs/common';
import { PrometheusService } from './prometheus.service';
import { LoggerService } from './logger.service';
import { HealthService } from './health.service';
import { MonitoringController } from './monitoring.controller';

@Module({
  providers: [PrometheusService, LoggerService, HealthService],
  controllers: [MonitoringController],
  exports: [PrometheusService, LoggerService, HealthService],
})
export class MonitoringModule {}
