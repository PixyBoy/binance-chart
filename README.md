# Trading Backend

NestJS backend that ingests real-time market data from Binance (Spot +
Futures) and serves it to a charting frontend, built to be exchange-agnostic
for the future.

## Structure

```
apps/backend/                 NestJS application
packages/exchange-adapters/   Exchange-agnostic contracts (IExchangeAdapter, types)
docker/                       Nginx, Prometheus, Grafana configs
.github/workflows/            CI + build/deploy pipelines
deploy/                       Scripts run on the VPS
```

## Local development (Windows/Docker Desktop)

Prerequisites: Docker Desktop running.

```bash
docker compose up
```

This starts: backend (hot-reload), TimescaleDB, Redis, Prometheus, Grafana.

- Backend: http://localhost:3000
- Grafana: http://localhost:3001 (login: admin / admin, see `.env.development`)
- Prometheus: http://localhost:9090

First run applies Prisma migrations (including the TimescaleDB
hypertable/continuous-aggregate setup) automatically.

## Working on the backend directly (without Docker)

```bash
corepack enable
pnpm install
pnpm --filter backend exec prisma generate
pnpm --filter backend start:dev
```

Requires a local Postgres/TimescaleDB and Redis reachable via the variables
in `.env.development`.

## Tests

```bash
pnpm test
```

## Production

See `docker-compose.prod.yml`, `.github/workflows/deploy.yml`, and
`deploy/`. Deploys require manual approval in GitHub Actions before
touching the server.

## Current phase

Fase 1–5 complete and merged to main.

**Fase 1:** Exchange adapter interface, BinanceAdapter, 1m kline ingestion for
BTCUSDT/ETHUSDT/BNBUSDT, TimescaleDB storage with continuous aggregates for
higher timeframes, unit tests alongside each piece.

**Fase 2:** Durable Redis Stream buffer between ingestion and persistence
(`KlineBufferService` → `KlineStreamConsumerService`), so a slow/failing
DB write never blocks the Binance connection or loses data. Exponential
backoff on reconnect. `GapFillService` automatically backfills any gap
between the last persisted candle and now whenever the connection is
restored, using the exact same durable path as live data — zero data
loss across a disconnect, as required.

**Fase 3:** REST historical API (`GET /klines?symbol=...&timeframe=...`) returns
formatted candles from TimescaleDB continuous aggregates. WebSocket Gateway
(`ChartGateway`, Socket.IO) delivers live 1m candles (forming + closed) to
subscribed clients via refcounted Redis Pub/Sub — no auth yet, scales to
thousands of symbols and clients. Chart output format abstracted via
`IChartDataFormatter` interface, currently `LightweightChartsFormatterService`.
Swapping to TradingView Charting Library later means adding one formatter class
and changing one DI binding — zero impact on the rest of the app. 61/61 tests
pass, 0 lint errors.

**Fase 4:** Order book depth20 stream via `connectOrderBookStream()` (independent
from klines), persisted in Redis as snapshots (5min TTL) for fast client
reconnect. `OrderbookGateway` broadcasts snapshots via Socket.IO with same
refcounted subscription model as klines. `OrderbookFormatterService` matches
lightweight-charts shape (ready for UDF later). 61 tests, 0 errors.

## Next phases

**Fase 4:** Order book (depth 20) stream via WebSocket (`@depth20` Binance stream),
persisted in Redis as a snapshot. Clients subscribe to OrderBook events.

**Fase 5:** Prometheus metrics + Pino structured logging. Per-process load,
subscriber counts, Binance rate-limit tracking, DB write latency, queue depth.

**Fase 6:** k6 load testing (combined ingestion + client subscriber scenarios).
Rate limiter tuning for Binance API. VPS final sizing based on observed Grafana data.

**Fase 7:** Full Binance symbol list rollout (currently hardcoded: BTCUSDT/ETHUSDT/BNBUSDT).
DB-driven subscription management (add/remove symbols via API, persist in config).

**Backlog:**
- User auth & API key management
- Order placement + account balance (out of scope for v1 charting-only backend, but planned)
- Multi-exchange abstraction (add Kraken/Coinbase adapters, re-use the same Ingestion→Charting pipeline)
