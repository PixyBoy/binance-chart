/**
 * Redis Stream used to decouple "receiving a kline from Binance" from
 * "writing it to TimescaleDB". Every event is XADDed here the instant
 * it's normalized; a separate consumer group drains it into the DB.
 * If the DB write fails or the process crashes mid-write, the message
 * stays in the stream (unacknowledged) and is retried — nothing is lost.
 */
export const KLINE_STREAM_KEY = 'stream:klines:1m';
export const KLINE_CONSUMER_GROUP = 'kline-persisters';
export const KLINE_CONSUMER_NAME = 'kline-persister-1';

// Cap the stream's approximate length so Redis memory doesn't grow
// unbounded if the DB falls badly behind — this is a safety valve, not
// the primary durability mechanism (the consumer group ack is).
export const KLINE_STREAM_MAXLEN = 200_000;

// Pending entries older than this are assumed abandoned (e.g. the process
// that read them crashed before acking) and are reclaimed for retry.
export const KLINE_PENDING_CLAIM_IDLE_MS = 30_000;
