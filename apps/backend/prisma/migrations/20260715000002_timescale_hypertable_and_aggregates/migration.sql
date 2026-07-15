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

-- NOTE: Continuous Aggregates (kline_5m/15m/1h/4h/1d) are deliberately NOT
-- created here. `CREATE MATERIALIZED VIEW ... WITH (timescaledb.continuous)`
-- cannot run inside a transaction block, and `prisma migrate deploy` always
-- wraps each migration.sql in one. They live in the sibling
-- continuous_aggregates.sql file instead, executed separately (via psql)
-- right after this migration in the docker-compose startup command.
