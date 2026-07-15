import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import WebSocket from 'ws';
import type {
  IExchangeAdapter,
  MarketEvent,
  RateLimitState,
  StreamSubscription,
  SymbolInfo,
} from '@trading-backend/exchange-adapters';
import type { EnvConfig } from '../common/config/env.schema';

/** Emitted whenever the live stream connection drops, per marketType+symbols group. */
export const BINANCE_DISCONNECTED_EVENT = 'binance.disconnected';
/** Emitted when the connection is (re-)established, including the very first connect. */
export const BINANCE_RECONNECTED_EVENT = 'binance.reconnected';

export interface BinanceConnectionEventPayload {
  marketType: StreamSubscription['marketType'];
  symbols: string[];
  /** True if this is a reconnect after a drop, false for the first-ever connect. */
  wasReconnect: boolean;
}

/**
 * Binance implementation of IExchangeAdapter. This is the ONLY file in the
 * app that should know Binance's wire format, endpoint paths, or stream
 * naming convention. Everything downstream consumes normalized MarketEvent
 * objects and has no idea Binance exists.
 */
@Injectable()
export class BinanceAdapterService
  implements IExchangeAdapter, OnModuleInit, OnModuleDestroy
{
  readonly exchangeId = 'binance';

  private readonly logger = new Logger(BinanceAdapterService.name);
  private ws: WebSocket | null = null;
  private connected = false;
  private everConnected = false;
  private reconnectAttempt = 0;
  private manuallyClosed = false;
  private rateLimitState: RateLimitState = {
    exchange: this.exchangeId,
    usedWeight: 0,
    limitWeight: 1200, // Binance default spot weight limit per minute
    windowResetAt: new Date(Date.now() + 60_000),
  };

  constructor(
    private readonly config: ConfigService<EnvConfig>,
    private readonly events: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    // Actual stream connection is started explicitly by KlineIngestionService
    // via connectStream(), not automatically here — Fase 1 only wires the
    // capability, the ingestion module decides *when* and *what* to subscribe.
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  isConnected(): boolean {
    return this.connected;
  }

  getRateLimitState(): RateLimitState {
    return this.rateLimitState;
  }

  async disconnect(): Promise<void> {
    this.manuallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  /**
   * Opens a combined-stream WebSocket connection for the requested symbols
   * and yields normalized kline events as they arrive. Only kline_1m is
   * implemented in Fase 1; orderbook channel is added in Fase 4.
   */
  async *connectStream(
    subscription: StreamSubscription,
  ): AsyncIterable<MarketEvent> {
    const streams = subscription.symbols
      .map((symbol) => `${symbol.toLowerCase()}@kline_1m`)
      .join('/');

    const baseUrl = this.config.get('BINANCE_WS_BASE_URL', { infer: true });
    const url = `${baseUrl}/stream?streams=${streams}`;

    const queue: MarketEvent[] = [];
    let resolveNext: (() => void) | null = null;

    // Exponential backoff, capped at 30s, so a prolonged Binance outage
    // doesn't hammer their servers with reconnect attempts.
    const maxBackoffMs = 30_000;
    const nextBackoffMs = () =>
      Math.min(1000 * 2 ** this.reconnectAttempt, maxBackoffMs);

    const connect = () => {
      this.logger.log(`Connecting to Binance stream: ${url}`);
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.connected = true;
        const wasReconnect = this.everConnected;
        this.everConnected = true;
        this.reconnectAttempt = 0;
        this.logger.log(
          wasReconnect
            ? 'Binance WebSocket reconnected'
            : 'Binance WebSocket connected',
        );
        this.events.emit(BINANCE_RECONNECTED_EVENT, {
          marketType: subscription.marketType,
          symbols: subscription.symbols,
          wasReconnect,
        } satisfies BinanceConnectionEventPayload);
      });

      this.ws.on('message', (raw: Buffer) => {
        try {
          const parsed = JSON.parse(raw.toString());
          const event = this.normalizeKlineMessage(
            parsed,
            subscription.marketType,
          );
          if (event) {
            queue.push(event);
            resolveNext?.();
          }
        } catch (err) {
          this.logger.error('Failed to parse Binance message', err as Error);
        }
      });

      this.ws.on('close', () => {
        const wasConnected = this.connected;
        this.connected = false;

        if (this.manuallyClosed) {
          return; // graceful shutdown, no reconnect
        }

        if (wasConnected) {
          this.events.emit(BINANCE_DISCONNECTED_EVENT, {
            marketType: subscription.marketType,
            symbols: subscription.symbols,
            wasReconnect: false,
          } satisfies BinanceConnectionEventPayload);
        }

        const delay = nextBackoffMs();
        this.reconnectAttempt += 1;
        this.logger.warn(
          `Binance WebSocket disconnected, reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`,
        );
        setTimeout(connect, delay);
      });

      this.ws.on('error', (err) => {
        this.logger.error('Binance WebSocket error', err);
      });
    };

    connect();

    // Simple async pull loop bridging the event-driven ws client to an
    // async generator that the ingestion service can `for await` over.
    while (true) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          resolveNext = resolve;
        });
      }
      const next = queue.shift();
      if (next) {
        yield next;
      }
    }
  }

  private normalizeKlineMessage(
    parsed: any,
    marketType: StreamSubscription['marketType'],
  ): MarketEvent | null {
    const k = parsed?.data?.k;
    if (!k) return null;

    return {
      type: 'kline',
      payload: {
        exchange: this.exchangeId,
        marketType,
        symbol: k.s,
        openTime: new Date(k.t),
        closeTime: new Date(k.T),
        open: k.o,
        high: k.h,
        low: k.l,
        close: k.c,
        volume: k.v,
        isClosed: k.x === true,
      },
    };
  }

  async fetchExchangeInfo(
    marketType: StreamSubscription['marketType'],
  ): Promise<SymbolInfo[]> {
    const baseUrl = this.config.get('BINANCE_REST_BASE_URL', { infer: true });
    const path = marketType === 'futures' ? '/fapi/v1/exchangeInfo' : '/api/v3/exchangeInfo';

    const res = await fetch(`${baseUrl}${path}`);
    this.trackRateLimitFromHeaders(res.headers);

    if (!res.ok) {
      throw new Error(`Binance exchangeInfo failed: ${res.status}`);
    }

    const data = (await res.json()) as { symbols: any[] };

    return data.symbols
      .filter((s) => s.status === 'TRADING')
      .map((s) => ({
        exchange: this.exchangeId,
        marketType,
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        isTradingEnabled: true,
      }));
  }

  async fetchHistoricalKlines(params: {
    marketType: StreamSubscription['marketType'];
    symbol: string;
    startTime: Date;
    endTime: Date;
  }): Promise<MarketEvent[]> {
    const baseUrl = this.config.get('BINANCE_REST_BASE_URL', { infer: true });
    const path = params.marketType === 'futures' ? '/fapi/v1/klines' : '/api/v3/klines';

    const url = new URL(`${baseUrl}${path}`);
    url.searchParams.set('symbol', params.symbol);
    url.searchParams.set('interval', '1m');
    url.searchParams.set('startTime', String(params.startTime.getTime()));
    url.searchParams.set('endTime', String(params.endTime.getTime()));
    url.searchParams.set('limit', '1000');

    const res = await fetch(url);
    this.trackRateLimitFromHeaders(res.headers);

    if (!res.ok) {
      throw new Error(`Binance klines fetch failed: ${res.status}`);
    }

    const rows = (await res.json()) as any[];

    return rows.map((row) => ({
      type: 'kline' as const,
      payload: {
        exchange: this.exchangeId,
        marketType: params.marketType,
        symbol: params.symbol,
        openTime: new Date(row[0]),
        closeTime: new Date(row[6]),
        open: row[1],
        high: row[2],
        low: row[3],
        close: row[4],
        volume: row[5],
        isClosed: true,
      },
    }));
  }

  private trackRateLimitFromHeaders(headers: Headers): void {
    const used = headers.get('x-mbx-used-weight-1m');
    if (used) {
      this.rateLimitState = {
        ...this.rateLimitState,
        usedWeight: Number(used),
        windowResetAt: new Date(Date.now() + 60_000),
      };
    }
  }
}
