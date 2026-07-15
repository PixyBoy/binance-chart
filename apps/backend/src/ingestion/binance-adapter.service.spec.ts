import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Fake WebSocket: a tiny event emitter with the subset of the `ws` API this
// adapter uses, so connectStream() can be driven without a real network
// connection. jest.mock calls are hoisted above imports, so every import of
// 'ws' anywhere in this file (including inside binance-adapter.service.ts)
// resolves to this fake.
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  listeners: Record<string, Array<(...args: any[]) => void>> = {};
  constructor(_url: string) {
    FakeWebSocket.instances.push(this);
  }
  on(event: string, cb: (...args: any[]) => void) {
    (this.listeners[event] ??= []).push(cb);
    return this;
  }
  close() {
    this.emit('close');
  }
  emit(event: string, ...args: any[]) {
    (this.listeners[event] ?? []).forEach((cb) => cb(...args));
  }
}

jest.mock('ws', () => ({
  __esModule: true,
  default: FakeWebSocket,
}));

import { BinanceAdapterService } from './binance-adapter.service';

describe('BinanceAdapterService', () => {
  let service: BinanceAdapterService;

  const configServiceMock = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        BINANCE_WS_BASE_URL: 'wss://stream.binance.com:9443',
        BINANCE_REST_BASE_URL: 'https://api.binance.com',
      };
      return values[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BinanceAdapterService,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<BinanceAdapterService>(BinanceAdapterService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('reports not connected before any stream is opened', () => {
    expect(service.isConnected()).toBe(false);
  });

  it('exposes a default rate limit state before any request is made', () => {
    const state = service.getRateLimitState();
    expect(state.exchange).toBe('binance');
    expect(state.usedWeight).toBe(0);
  });

  it('fetchExchangeInfo filters out non-TRADING symbols and normalizes shape', async () => {
    const fakeResponse = {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        symbols: [
          {
            symbol: 'BTCUSDT',
            baseAsset: 'BTC',
            quoteAsset: 'USDT',
            status: 'TRADING',
          },
          {
            symbol: 'OLDCOIN',
            baseAsset: 'OLD',
            quoteAsset: 'USDT',
            status: 'BREAK',
          },
        ],
      }),
    } as unknown as Response;

    jest.spyOn(global, 'fetch').mockResolvedValue(fakeResponse);

    const result = await service.fetchExchangeInfo('spot');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      exchange: 'binance',
      symbol: 'BTCUSDT',
      baseAsset: 'BTC',
      quoteAsset: 'USDT',
      isTradingEnabled: true,
    });
  });

  it('fetchExchangeInfo throws on a non-ok HTTP response', async () => {
    const fakeResponse = {
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ({}),
    } as unknown as Response;

    jest.spyOn(global, 'fetch').mockResolvedValue(fakeResponse);

    await expect(service.fetchExchangeInfo('spot')).rejects.toThrow(
      'Binance exchangeInfo failed: 500',
    );
  });

  it('tracks used rate-limit weight from response headers', async () => {
    const headers = new Headers({ 'x-mbx-used-weight-1m': '42' });
    const fakeResponse = {
      ok: true,
      status: 200,
      headers,
      json: async () => ({ symbols: [] }),
    } as unknown as Response;

    jest.spyOn(global, 'fetch').mockResolvedValue(fakeResponse);

    await service.fetchExchangeInfo('spot');

    expect(service.getRateLimitState().usedWeight).toBe(42);
  });

  describe('connectStream reconnect events', () => {
    it('emits reconnected(wasReconnect=false) on first connect, then disconnected after a drop', async () => {
      const emitSpy = jest.fn();
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BinanceAdapterService,
          { provide: ConfigService, useValue: configServiceMock },
          { provide: EventEmitter2, useValue: { emit: emitSpy } },
        ],
      }).compile();

      const freshService = module.get(BinanceAdapterService);

      const iterator = freshService
        .connectStream({
          marketType: 'spot',
          symbols: ['BTCUSDT'],
          channels: ['kline_1m'],
        })
        [Symbol.asyncIterator]();
      // Async generators don't execute any body code until .next() is
      // called for the first time. We don't await the returned promise
      // (it only resolves once a kline event is queued) — we just need
      // the synchronous prefix (connect() + listener registration) to run.
      void iterator.next();

      // Give the generator a tick to call connect() and register listeners.
      await new Promise((r) => setImmediate(r));

      const ws = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
      ws.emit('open');

      expect(emitSpy).toHaveBeenCalledWith(
        'binance.reconnected',
        expect.objectContaining({ wasReconnect: false }),
      );

      ws.emit('close'); // simulate a drop
      await new Promise((r) => setImmediate(r));

      expect(emitSpy).toHaveBeenCalledWith(
        'binance.disconnected',
        expect.objectContaining({ symbols: ['BTCUSDT'] }),
      );
    });
  });
});
