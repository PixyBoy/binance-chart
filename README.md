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

Fase 1: Exchange adapter interface, BinanceAdapter, 1m kline ingestion for
BTCUSDT/ETHUSDT/BNBUSDT, TimescaleDB storage with continuous aggregates for
higher timeframes, unit tests alongside each piece.
