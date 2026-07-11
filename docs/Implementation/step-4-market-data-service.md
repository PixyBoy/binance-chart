```mermaid

# GET /markets
# GET /symbols
# GET /candles
# GET /ticker
# GET /trades
# GET /orderbook
# GET /klines
# GET /exchange-info

sequenceDiagram
    autonumber

    actor Client

    participant API as Market Data API
    participant Redis
    participant DB as PostgreSQL + TimescaleDB

    Client->>API: GET /candles?symbol=BTCUSDT&interval=1m&from=...&to=...

    API->>DB: Query historical candles

    DB-->>API: Historical candle series

    API->>Redis: Get latest live candle

    alt Live candle exists

        Redis-->>API: Current updating candle

        API->>API: Merge historical + live candle

    else No live candle

        Redis-->>API: Not Found

    end

    API-->>Client: Complete candle series
```