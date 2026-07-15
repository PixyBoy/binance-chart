TimescaleDB => source of truth (different schema)
Redis => latest details (latest prices, latest candle for interval)
NestJS => Framework
Message broker => RABBITMQ OR KAFKA
Communication between services => gRPC
Monitoring => Grafana and Prometheus

TradingView Datafeed API / UDF adaptor