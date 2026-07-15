-- This migration is hand-written (not Prisma-generated) because Prisma has
-- no native concept of TimescaleDB hypertables or continuous aggregates.
-- It must always run AFTER the plain "kline_1m" table exists.

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert kline_1m into a hypertable, partitioned by openTime.
-- migrate_data => true allows this to run even if rows already exist.
SELECT create_hypertable('kline_1m', 'openTime', migrate_data => true);

-- Automatically compress chunks older than 7 days to save disk space
-- while keeping full history queryable (per project requirement: never
-- discard historical data, but no need to keep it uncompressed forever).
ALTER TABLE kline_1m SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'exchange, "marketType", symbol'
);

SELECT add_compression_policy('kline_1m', INTERVAL '7 days');

-- ---------------------------------------------------------------------------
-- Continuous Aggregates: every timeframe above 1m is derived automatically
-- by TimescaleDB itself, never computed or stored by the application.
-- Numeric casts are needed because OHLCV columns are stored as TEXT
-- (decimal-safe, avoids float rounding issues) in the base table.
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW kline_5m
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

CREATE MATERIALIZED VIEW kline_15m
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

CREATE MATERIALIZED VIEW kline_1h
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

CREATE MATERIALIZED VIEW kline_4h
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

CREATE MATERIALIZED VIEW kline_1d
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
SELECT add_continuous_aggregate_policy('kline_5m',  start_offset => INTERVAL '1 day',  end_offset => INTERVAL '5 minutes',  schedule_interval => INTERVAL '1 minute');
SELECT add_continuous_aggregate_policy('kline_15m', start_offset => INTERVAL '1 day',  end_offset => INTERVAL '15 minutes', schedule_interval => INTERVAL '5 minutes');
SELECT add_continuous_aggregate_policy('kline_1h',  start_offset => INTERVAL '3 days', end_offset => INTERVAL '1 hour',     schedule_interval => INTERVAL '15 minutes');
SELECT add_continuous_aggregate_policy('kline_4h',  start_offset => INTERVAL '7 days', end_offset => INTERVAL '4 hours',    schedule_interval => INTERVAL '1 hour');
SELECT add_continuous_aggregate_policy('kline_1d',  start_offset => INTERVAL '30 days',end_offset => INTERVAL '1 day',      schedule_interval => INTERVAL '1 hour');
