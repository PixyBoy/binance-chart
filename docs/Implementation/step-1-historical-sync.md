```mermaid
# Scheduler → decides what should be synchronized.
# Historical Sync Worker → downloads data.
# Binance REST API → provides candles.
# TimescaleDB → stores data.

sequenceDiagram
    autonumber

    actor System

    participant Scheduler
    participant SyncWorker as Historical Sync Worker
    participant Binance as Binance REST API
    participant DB as PostgreSQL + TimescaleDB

    System->>Scheduler: Start historical synchronization

    Scheduler->>DB: Check latest stored candle
    DB-->>Scheduler: Latest open_time (or empty)

    alt Symbol has no historical data
        Scheduler->>SyncWorker: Sync from earliest supported timestamp
    else Symbol already exists
        Scheduler->>SyncWorker: Sync missing candles from latest + 1 interval
    end

    loop Until current time reached

        SyncWorker->>Binance: GET /uiKlines(symbol, interval, startTime, limit=1000)

        Binance-->>SyncWorker: Up to 1000 candles

        alt Response contains candles

            SyncWorker->>SyncWorker: Validate response
            SyncWorker->>SyncWorker: Remove duplicated candles
            SyncWorker->>SyncWorker: Verify chronological order

            SyncWorker->>DB: Batch INSERT ... ON CONFLICT DO NOTHING

            DB-->>SyncWorker: Rows inserted

            SyncWorker->>SyncWorker: Advance startTime to next candle

        else No more candles

            SyncWorker-->>Scheduler: Synchronization completed

        end

    end

    Scheduler->>DB: Update synchronization metadata
    Scheduler-->>System: Historical synchronization finished
```