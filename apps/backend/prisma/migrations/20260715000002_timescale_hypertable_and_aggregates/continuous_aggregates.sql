-- This runs OUTSIDE the Prisma transaction because CREATE MATERIALIZED VIEW
-- ... WITH DATA cannot run inside a transaction block in TimescaleDB.
-- This file is executed by the docker-compose startup command after
-- `prisma migrate deploy` completes.

-- ---------------------------------------------------------------------------
-- Continuous Aggregates: every timeframe above 1m is derived automatically
-- by TimescaleDB itself, never computed or stored by the application.
-- Numeric casts are needed because OHLCV columns are stored as TEXT
-- (decimal-safe, avoids float rounding issues) in the base table.
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS kline_5m
WITH (timescaledb.continuous) AS
SELECT
  exchange,
  "marketType",
  symbol,
  time_bucket('5 minutes', "openTime") AS "openTime",
  first(open::numeric, "openTime")  AS open,
  max(high::numeric)                AS high,
  min(low::numeric)                 AS low,
  last(close::numeric, "openTime")  AS close,
  sum(volume::numeric)              AS volume
FROM kline_1m
GROUP BY exchange, "marketType", symbol, time_bucket('5 minutes', "openTime");

CREATE MATERIALIZED VIEW IF NOT EXISTS kline_15m
WITH (timescaledb.continuous) AS
SELECT
  exchange, "marketType", symbol,
  time_bucket('15 minutes', "openTime") AS "openTime",
  first(open::numeric, "openTime") AS open,
  max(high::numeric) AS high,
  min(low::numeric) AS low,
  last(close::numeric, "openTime") AS close,
  sum(volume::numeric) AS volume
FROM kline_1m
GROUP BY exchange, "marketType", symbol, time_bucket('15 minutes', "openTime");

CREATE MATERIALIZED VIEW IF NOT EXISTS kline_1h
WITH (timescaledb.continuous) AS
SELECT
  exchange, "marketType", symbol,
  time_bucket('1 hour', "openTime") AS "openTime",
  first(open::numeric, "openTime") AS open,
  max(high::numeric) AS high,
  min(low::numeric) AS low,
  last(close::numeric, "openTime") AS close,
  sum(volume::numeric) AS volume
FROM kline_1m
GROUP BY exchange, "marketType", symbol, time_bucket('1 hour', "openTime");

CREATE MATERIALIZED VIEW IF NOT EXISTS kline_4h
WITH (timescaledb.continuous) AS
SELECT
  exchange, "marketType", symbol,
  time_bucket('4 hours', "openTime") AS "openTime",
  first(open::numeric, "openTime") AS open,
  max(high::numeric) AS high,
  min(low::numeric) AS low,
  last(close::numeric, "openTime") AS close,
  sum(volume::numeric) AS volume
FROM kline_1m
GROUP BY exchange, "marketType", symbol, time_bucket('4 hours', "openTime");

CREATE MATERIALIZED VIEW IF NOT EXISTS kline_1d
WITH (timescaledb.continuous) AS
SELECT
  exchange, "marketType", symbol,
  time_bucket('1 day', "openTime") AS "openTime",
  first(open::numeric, "openTime") AS open,
  max(high::numeric) AS high,
  min(low::numeric) AS low,
  last(close::numeric, "openTime") AS close,
  sum(volume::numeric) AS volume
FROM kline_1m
GROUP BY exchange, "marketType", symbol, time_bucket('1 day', "openTime");

-- Keep every continuous aggregate refreshed automatically in the background.
-- start_offset/end_offset/schedule_interval are conservative defaults;
-- tune once real load data is available (Fase 6).
SELECT add_continuous_aggregate_policy('kline_5m',  start_offset => INTERVAL '1 day',  end_offset => INTERVAL '5 minutes',  schedule_interval => INTERVAL '1 minute', if_not_exists => true);
SELECT add_continuous_aggregate_policy('kline_15m', start_offset => INTERVAL '1 day',  end_offset => INTERVAL '15 minutes', schedule_interval => INTERVAL '5 minutes', if_not_exists => true);
SELECT add_continuous_aggregate_policy('kline_1h',  start_offset => INTERVAL '3 days', end_offset => INTERVAL '1 hour',     schedule_interval => INTERVAL '15 minutes', if_not_exists => true);
SELECT add_continuous_aggregate_policy('kline_4h',  start_offset => INTERVAL '7 days', end_offset => INTERVAL '4 hours',    schedule_interval => INTERVAL '1 hour', if_not_exists => true);
SELECT add_continuous_aggregate_policy('kline_1d',  start_offset => INTERVAL '30 days',end_offset => INTERVAL '1 day',      schedule_interval => INTERVAL '1 hour', if_not_exists => true);