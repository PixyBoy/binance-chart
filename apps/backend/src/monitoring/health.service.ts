import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../common/redis/redis.constants';
import { PrismaService } from '../common/prisma/prisma.service';
import { EXCHANGE_ADAPTER } from '@trading-backend/exchange-adapters';
import type { IExchangeAdapter } from '@trading-backend/exchange-adapters';
import { PrometheusService } from './prometheus.service';
import { LoggerService } from './logger.service';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<
    string,
    {
      status: 'up' | 'down';
      latency?: number;
      message?: string;
    }
  >;
  timestamp: Date;
}

/**
 * Monitors all critical services and updates Prometheus metrics.
 * Used for liveness/readiness probes and operational dashboards.
 */
@Injectable()
export class HealthService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prisma: PrismaService,
    @Inject(EXCHANGE_ADAPTER)
    private readonly exchangeAdapter: IExchangeAdapter,
    private readonly prometheus: PrometheusService,
    private readonly logger: LoggerService,
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const services: Record<string, any> = {};

    // Backend API (this service is running if we reach here)
    services.backend = { status: 'up', latency: 0 };
    this.prometheus.serviceHealth.set({ service: 'backend' }, 1);

    // TimescaleDB
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      services.database = { status: 'up', latency };
      this.prometheus.serviceHealth.set({ service: 'database' }, 1);
    } catch (err) {
      services.database = {
        status: 'down',
        message: (err as Error).message,
      };
      this.prometheus.serviceHealth.set({ service: 'database' }, 0);
      this.logger.error('Database health check failed', (err as Error).stack);
    }

    // Redis
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      services.redis = { status: 'up', latency };
      this.prometheus.serviceHealth.set({ service: 'redis' }, 1);
    } catch (err) {
      services.redis = {
        status: 'down',
        message: (err as Error).message,
      };
      this.prometheus.serviceHealth.set({ service: 'redis' }, 0);
      this.logger.error('Redis health check failed', (err as Error).stack);
    }

    // Binance REST API (via adapter info fetch)
    try {
      const start = Date.now();
      await this.exchangeAdapter.fetchExchangeInfo('spot');
      const latency = Date.now() - start;
      services.binance_rest = { status: 'up', latency };
      this.prometheus.serviceHealth.set({ service: 'binance_rest' }, 1);
    } catch (err) {
      services.binance_rest = {
        status: 'down',
        message: (err as Error).message,
      };
      this.prometheus.serviceHealth.set({ service: 'binance_rest' }, 0);
      this.logger.error(
        'Binance REST health check failed',
        (err as Error).stack,
      );
    }

    // Binance WebSocket
    services.binance_socket = {
      status: this.exchangeAdapter.isConnected() ? 'up' : 'down',
    };
    this.prometheus.serviceHealth.set(
      { service: 'binance_socket' },
      this.exchangeAdapter.isConnected() ? 1 : 0,
    );

    // Determine overall health
    const downServices = Object.values(services).filter(
      (s) => s.status === 'down',
    ).length;
    const overallStatus =
      downServices === 0
        ? 'healthy'
        : downServices === 1
          ? 'degraded'
          : 'unhealthy';

    return {
      status: overallStatus,
      services,
      timestamp: new Date(),
    };
  }

  /**
   * Liveness probe: is the backend running?
   */
  isLive(): boolean {
    return true; // if we can call this, backend is running
  }

  /**
   * Readiness probe: can we serve traffic?
   */
  async isReady(): Promise<boolean> {
    const health = await this.checkHealth();
    // Ready if database and Redis are up
    return (
      health.services.database?.status === 'up' &&
      health.services.redis?.status === 'up'
    );
  }
}
