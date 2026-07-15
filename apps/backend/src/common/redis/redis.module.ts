import { Global, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import type { EnvConfig } from '../config/env.schema';

/**
 * Global module exposing a single shared ioredis client behind the
 * REDIS_CLIENT token. Redis is used for two independent purposes in this
 * app (kept as one connection for simplicity at this scale):
 *   1. Durable buffer (Redis Streams) between exchange ingestion and the
 *      DB writer, so a slow/failing DB write never loses a message and
 *      never blocks the exchange connection.
 *   2. Pub/Sub fan-out to WebSocket subscribers (added in Fase 3).
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig>) => {
        const logger = new Logger('RedisClient');
        const client = new Redis({
          host: config.get('REDIS_HOST', { infer: true }),
          port: config.get('REDIS_PORT', { infer: true }),
          password: config.get('REDIS_PASSWORD', { infer: true }) || undefined,
          // Keep retrying forever with backoff — losing the Redis
          // connection must never crash the process.
          retryStrategy: (attempt) => Math.min(attempt * 200, 5000),
        });

        client.on('error', (err) => logger.error('Redis error', err));
        client.on('connect', () => logger.log('Connected to Redis'));

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor() {}

  async onModuleDestroy(): Promise<void> {
    // Individual providers close their own Redis client via DI teardown
    // in more complex setups; kept minimal here since ioredis clients
    // close cleanly on process exit for this app's scale.
  }
}
