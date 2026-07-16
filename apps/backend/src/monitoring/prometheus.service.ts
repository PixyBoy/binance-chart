import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, register } from 'prom-client';

/**
 * Centralized Prometheus metrics for observability.
 * All metrics are registered globally and exposed via /metrics endpoint.
 */
@Injectable()
export class PrometheusService {
  // ====== Binance Connection Metrics ======
  binanceSocketConnected = new Gauge({
    name: 'binance_socket_connected',
    help: 'Binance WebSocket connection status (0=disconnected, 1=connected)',
    labelNames: ['stream_type'], // 'kline', 'orderbook'
  });

  binanceSocketReconnectsTotal = new Counter({
    name: 'binance_socket_reconnects_total',
    help: 'Total number of Binance WebSocket reconnection attempts',
    labelNames: ['stream_type'],
  });

  binanceApiRateLimitUsed = new Gauge({
    name: 'binance_api_rate_limit_used',
    help: 'Current Binance API rate-limit weight used (0-1200)',
  });

  binanceApiRateLimitRemaining = new Gauge({
    name: 'binance_api_rate_limit_remaining',
    help: 'Remaining Binance API rate-limit weight',
  });

  // ====== Kline Ingestion Metrics ======
  klineIngestRate = new Gauge({
    name: 'kline_ingest_rate_per_sec',
    help: 'Number of 1m candles ingested per second',
  });

  klineBufferDepth = new Gauge({
    name: 'kline_buffer_depth',
    help: 'Number of pending events in Redis Stream buffer',
  });

  klineGapsDetected = new Counter({
    name: 'kline_gaps_detected_total',
    help: 'Total gaps detected and filled via reconnect backfill',
    labelNames: ['symbol'],
  });

  // ====== Order Book Metrics ======
  orderbookUpdateRate = new Gauge({
    name: 'orderbook_update_rate_per_sec',
    help: 'Number of depth snapshots processed per second',
  });

  orderbookSubscribers = new Gauge({
    name: 'orderbook_subscribers',
    help: 'Number of WebSocket subscribers per symbol',
    labelNames: ['symbol'],
  });

  // ====== Database Metrics ======
  dbWriteLatency = new Histogram({
    name: 'db_write_latency_ms',
    help: 'Database write operation latency in milliseconds',
    buckets: [10, 25, 50, 100, 250, 500, 1000, 2500],
    labelNames: ['operation'], // 'upsert_kline', 'update_cursor', etc
  });

  dbQueryErrors = new Counter({
    name: 'db_query_errors_total',
    help: 'Total database query errors',
    labelNames: ['operation', 'error_type'],
  });

  // ====== Redis Metrics ======
  redisQueueDepth = new Gauge({
    name: 'redis_queue_depth',
    help: 'Number of pending events in Redis (Stream + sorted sets)',
    labelNames: ['queue_type'], // 'kline_buffer', 'orderbook_pending'
  });

  redisOperationLatency = new Histogram({
    name: 'redis_operation_latency_ms',
    help: 'Redis operation latency in milliseconds',
    buckets: [1, 5, 10, 25, 50, 100, 250],
    labelNames: ['operation'], // 'xadd', 'publish', 'get', etc
  });

  redisErrors = new Counter({
    name: 'redis_errors_total',
    help: 'Total Redis errors',
    labelNames: ['operation'],
  });

  // ====== WebSocket Metrics ======
  websocketClientsConnected = new Gauge({
    name: 'websocket_clients_connected',
    help: 'Number of connected WebSocket clients',
    labelNames: ['gateway'], // 'kline', 'orderbook'
  });

  websocketMessagesPublished = new Counter({
    name: 'websocket_messages_published_total',
    help: 'Total WebSocket messages published to clients',
    labelNames: ['gateway', 'message_type'],
  });

  websocketSubscribers = new Gauge({
    name: 'websocket_subscribers_per_symbol',
    help: 'Number of active subscribers per symbol',
    labelNames: ['symbol', 'gateway', 'market_type'],
  });

  // ====== HTTP Metrics ======
  httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'path', 'status'],
  });

  httpRequestDuration = new Histogram({
    name: 'http_request_duration_ms',
    help: 'HTTP request duration in milliseconds',
    buckets: [10, 50, 100, 250, 500, 1000],
    labelNames: ['method', 'path'],
  });

  // ====== Service Health Metrics ======
  serviceHealth = new Gauge({
    name: 'service_health_status',
    help: 'Service health status (0=down, 1=healthy)',
    labelNames: ['service'], // 'backend', 'database', 'redis', 'binance_rest', 'binance_socket'
  });

  /**
   * Get all metrics as Prometheus exposition format text
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    register.resetMetrics();
  }
}
