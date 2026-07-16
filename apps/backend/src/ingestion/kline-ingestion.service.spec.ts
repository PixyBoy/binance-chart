import { Test, TestingModule } from '@nestjs/testing';
import { EXCHANGE_ADAPTER } from '@trading-backend/exchange-adapters';
import { KlineIngestionService } from './kline-ingestion.service';
import { KlineBufferService } from './kline-buffer.service';
import { LiveKlinePublisherService } from './live-kline-publisher.service';

describe('KlineIngestionService', () => {
  let service: KlineIngestionService;
  let bufferMock: { push: jest.Mock };
  let publisherMock: { publish: jest.Mock };

  const sampleEvent = {
    type: 'kline' as const,
    payload: {
      exchange: 'binance',
      marketType: 'spot' as const,
      symbol: 'BTCUSDT',
      openTime: new Date(),
      closeTime: new Date(),
      open: '1',
      high: '1',
      low: '1',
      close: '1',
      volume: '1',
      isClosed: true,
    },
  };

  async function* fakeStream() {
    yield sampleEvent;
  }

  beforeEach(async () => {
    bufferMock = { push: jest.fn().mockResolvedValue(undefined) };
    publisherMock = { publish: jest.fn().mockResolvedValue(undefined) };

    const exchangeAdapterMock = {
      connectStream: jest.fn().mockReturnValue(fakeStream()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KlineIngestionService,
        { provide: EXCHANGE_ADAPTER, useValue: exchangeAdapterMock },
        { provide: KlineBufferService, useValue: bufferMock },
        { provide: LiveKlinePublisherService, useValue: publisherMock },
      ],
    }).compile();

    service = module.get<KlineIngestionService>(KlineIngestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('publishes and buffers every event from the adapter stream', async () => {
    await (service as any).startIngesting();

    expect(publisherMock.publish).toHaveBeenCalledWith(sampleEvent);
    expect(bufferMock.push).toHaveBeenCalledWith(sampleEvent);
  });

  it('keeps consuming subsequent events even if buffering one fails', async () => {
    async function* twoEvents() {
      yield sampleEvent;
      yield sampleEvent;
    }
    (service as any).exchangeAdapter = {
      connectStream: jest.fn().mockReturnValue(twoEvents()),
    };
    bufferMock.push
      .mockRejectedValueOnce(new Error('redis down'))
      .mockResolvedValueOnce(undefined);

    await (service as any).startIngesting();

    expect(bufferMock.push).toHaveBeenCalledTimes(2);
    expect(publisherMock.publish).toHaveBeenCalledTimes(2);
  });
});
