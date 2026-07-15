import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type Redis from 'ioredis';
import type { NormalizedKline } from '@trading-backend/exchange-adapters';
import { REDIS_CLIENT } from '../common/redis/redis.constants';
import { KlinePersistenceService } from './kline-persistence.service';
import {
  KLINE_CONSUMER_GROUP,
  KLINE_CONSUMER_NAME,
  KLINE_PENDING_CLAIM_IDLE_MS,
  KLINE_STREAM_KEY,
} from './kline-stream.constants';

/**
 * Drains KLINE_STREAM_KEY and persists every entry via
 * KlinePersistenceService, acknowledging only after a successful write.
 * This is the ONLY consumer of the durable buffer, so ingestion (writing
 * to Redis) and persistence (writing to Postgres) can scale, fail, and
 * retry independently of each other and of client-facing load.
 */
@Injectable()
export class KlineStreamConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(KlineStreamConsumerService.name);
  private running = true;
  private claimInterval: NodeJS.Timeout | null = null;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly persistence: KlinePersistenceService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureConsumerGroup();
    void this.consumeLoop();

    // Periodically reclaim entries some crashed/stuck consumer read but
    // never acked, so a single worker crash never permanently strands data.
    this.claimInterval = setInterval(
      () => void this.reclaimStaleEntries(),
      KLINE_PENDING_CLAIM_IDLE_MS,
    );
  }

  onModuleDestroy(): void {
    this.running = false;
    if (this.claimInterval) clearInterval(this.claimInterval);
  }

  private async ensureConsumerGroup(): Promise<void> {
    try {
      await this.redis.xgroup(
        'CREATE',
        KLINE_STREAM_KEY,
        KLINE_CONSUMER_GROUP,
        '$',
        'MKSTREAM',
      );
      this.logger.log(`Created consumer group ${KLINE_CONSUMER_GROUP}`);
    } catch (err) {
      if ((err as Error).message.includes('BUSYGROUP')) {
        // Group already exists from a previous run — expected on restart.
        return;
      }
      throw err;
    }
  }

  private async consumeLoop(): Promise<void> {
    while (this.running) {
      try {
        const result = await this.redis.xreadgroup(
          'GROUP',
          KLINE_CONSUMER_GROUP,
          KLINE_CONSUMER_NAME,
          'COUNT',
          100,
          'BLOCK',
          5000,
          'STREAMS',
          KLINE_STREAM_KEY,
          '>',
        );

        if (!result) continue; // BLOCK timeout, nothing new — loop again

        const [[, entries]] = result as [string, [string, string[]][]][];
        for (const [id, fields] of entries) {
          await this.handleEntry(id, fields);
        }
      } catch (err) {
        this.logger.error('Error in kline stream consume loop', err as Error);
        // Brief pause to avoid a hot error loop if Redis is having issues.
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  private async handleEntry(id: string, fields: string[]): Promise<void> {
    try {
      const payloadIndex = fields.indexOf('payload');
      const raw = fields[payloadIndex + 1];
      const kline = JSON.parse(raw) as NormalizedKline;
      // Dates survive JSON.stringify as ISO strings — restore them.
      kline.openTime = new Date(kline.openTime);
      kline.closeTime = new Date(kline.closeTime);

      await this.persistence.persistKline(kline);
      await this.redis.xack(KLINE_STREAM_KEY, KLINE_CONSUMER_GROUP, id);
    } catch (err) {
      // Deliberately NOT acking — the entry stays pending and will be
      // retried by reclaimStaleEntries(). Logged because a persistent
      // failure here means data is at risk of falling behind.
      this.logger.error(
        `Failed to persist stream entry ${id}, left pending for retry`,
        err as Error,
      );
    }
  }

  private async reclaimStaleEntries(): Promise<void> {
    try {
      const [, entries] = (await this.redis.xautoclaim(
        KLINE_STREAM_KEY,
        KLINE_CONSUMER_GROUP,
        KLINE_CONSUMER_NAME,
        KLINE_PENDING_CLAIM_IDLE_MS,
        '0',
        'COUNT',
        100,
      )) as [string, [string, string[]][], string[]];

      for (const [id, fields] of entries) {
        this.logger.warn(`Reclaiming stale pending entry ${id} for retry`);
        await this.handleEntry(id, fields);
      }
    } catch (err) {
      this.logger.error('Failed to reclaim stale pending entries', err as Error);
    }
  }
}
