-- Enable TimescaleDB extension if not already enabled
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Optional: Configure TimescaleDB settings
-- ALTER SYSTEM SET timescaledb.telemetry_level = 'off';