import { Test, TestingModule } from '@nestjs/testing';
import { EXCHANGE_ADAPTER } from '@trading-backend/exchange-adapters';
import type { OrderBookEvent } from '@trading-backend/exchange-adapters';
import { OrderbookIngestionService } from './orderbook-ingestion.service';
import { OrderbookSnapshotService } from './orderbook-snapshot.service';
import { OrderbookPublisherService } from './orderbook-publisher.service';

describe('OrderbookIngestionService', () => {
  let service: OrderbookIngestionService;
  let snapshotMock: { save: jest.Mock };
  let publisherMock: { publish: jest.Mock };

  const sampleEvent: OrderBookEvent = {
    type: 'orderbook',
    payload: {
      exchange: 'binance',
      marketType: 'spot' as const,
      symbol: 'BTCUSDT',
      timestamp: new Date(),
      bids: [{ price: '1', quantity: '1' }],
      asks: [{ price: '2', quantity: '1' }],
    },
  };

  async function* fakeStream() {
    yield sampleEvent;
  }

  beforeEach(async () => {
    snapshotMock = { save: jest.fn().mockResolvedValue(undefined) };
    publisherMock = { publish: jest.fn().mockResolvedValue(undefined) };

    const exchangeAdapterMock = {
      connectOrderBookStream: jest.fn().mockReturnValue(fakeStream()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderbookIngestionService,
        { provide: EXCHANGE_ADAPTER, useValue: exchangeAdapterMock },
        { provide: OrderbookSnapshotService, useValue: snapshotMock },
        { provide: OrderbookPublisherService, useValue: publisherMock },
      ],
    }).compile();

    service = module.get<OrderbookIngestionService>(OrderbookIngestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('publishes and snapshots every order book event from stream', async () => {
    await (service as any).startIngesting();

    expect(publisherMock.publish).toHaveBeenCalledWith(sampleEvent.payload);
    expect(snapshotMock.save).toHaveBeenCalledWith(sampleEvent.payload);
  });
});
