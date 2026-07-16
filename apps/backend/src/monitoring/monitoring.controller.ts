import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { PrometheusService } from './prometheus.service';
import { HealthService } from './health.service';

@Controller('health')
export class MonitoringController {
  constructor(
    private readonly health: HealthService,
    private readonly prometheus: PrometheusService,
  ) {}

  /**
   * Liveness probe: backend is running
   * Used by Kubernetes/docker-compose: 200 OK = alive
   */
  @Get('/live')
  @HttpCode(HttpStatus.OK)
  isLive(): { status: 'alive' } {
    this.health.isLive();
    return { status: 'alive' };
  }

  /**
   * Readiness probe: backend can serve traffic
   * Used by Kubernetes load balancer: 200 OK = ready
   */
  @Get('/ready')
  @HttpCode(HttpStatus.SERVICE_UNAVAILABLE)
  async isReady(): Promise<{ status: 'ready' | 'not_ready' }> {
    const ready = await this.health.isReady();
    if (!ready) {
      throw new Error('Service not ready');
    }
    return { status: 'ready' };
  }

  /**
   * Full health status with all services
   * Used by: monitoring dashboards, incident detection
   */
  @Get('/status')
  async getHealth() {
    return this.health.checkHealth();
  }

  /**
   * Prometheus metrics exposition format
   * Scraped by: Prometheus server every 15s
   */
  @Get('/metrics')
  @HttpCode(HttpStatus.OK)
  async getMetrics(): Promise<string> {
    return this.prometheus.getMetrics();
  }
}
