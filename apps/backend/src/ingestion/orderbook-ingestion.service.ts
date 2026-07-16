import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EXCHANGE_ADAPTER } from '@trading-backend/exchange-adapters';
import type {
  IExchangeAdapter,
  MarketType,
} from '@trading-backend/exchange-adapters';
import { OrderbookSnapshotService } from './orderbook-snapshot.service';
import { OrderbookPublisherService } from './orderbook-publisher.service';

/**
 * Subscribes to the live order book stream and fans out every snapshot
 * two ways:
 *   1. OrderbookSnapshotService — Redis snapshot (persisted with TTL)
 *   2. OrderbookPublisherService — best-effort Redis Pub/Sub broadcast
 * Independent streams: a slow Redis never delays ingestion.
 */
@Injectable()
export class OrderbookIngestionService implements OnModuleInit {
  private readonly logger = new Logger(OrderbookIngestionService.name);

  // TODO: move to config/DB-driven symbol list
  private readonly symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
  private readonly marketType: MarketType = 'spot';

  constructor(
    @Inject(EXCHANGE_ADAPTER)
    private readonly exchangeAdapter: IExchangeAdapter,
    private readonly snapshot: OrderbookSnapshotService,
    private readonly publisher: OrderbookPublisherService,
  ) {}

  onModuleInit(): void {
    void this.startIngesting();
  }

  private async startIngesting(): Promise<void> {
    this.logger.log(
      `Starting order book ingestion for ${this.symbols.join(', ')} (${this.marketType})`,
    );

    const stream = this.exchangeAdapter.connectOrderBookStream({
      marketType: this.marketType,
      symbols: this.symbols,
      channels: ['orderbook'],
    });

    for await (const event of stream) {
      void this.publisher.publish(event.payload);
      void this.snapshot.save(event.payload);
    }
  }
}
