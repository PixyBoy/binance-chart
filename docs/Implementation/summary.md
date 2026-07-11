# API Layer Implementation Summary
1. Retrieving Candlestick data.
    a. Klines HTTP API: symbol, interval, startTime, endTime, limit
        URL: https://api.binance.com/api/v3/klines
        METHOD: GET
        Payload:  
        {
            "symbol": "BTCUSDT",
            "interval": "1m",
            "startTime": 1622505600000,
            "endTime": 1622592000000,
            "limit": 1000
        }
        Response: 
        [
            [
                1622505600000,      // Open time
                "35000.00",         // Open
                "35100.00",         // High
                "34900.00",         // Low
                "35050.00",         // Close
                "100.0",            // Volume
                1622505660000,      // Close time
                "3505000.0",        // Quote asset volume
                100,                // Number of trades
                "50.0",             // Taker buy base asset volume
                "1750000.0",        // Taker buy quote asset volume
                "0"                 // Ignore
            ],
            ...
        ]
2. Cache API Results: Implement a cache-aside layer (Redis) so that frequent requests hit the cache instead of Binance. Use Redis with short TTLs based on data volatility (e.g. cache a daily OHLCV point for 5–15 minutes, more static data longer). On each cache miss, fetch from Binance, store the result, and return it. Always handle Redis failures gracefully so the service still works even if Redis is down. This can turn slow database fetches (hundreds of ms) into sub-ms cache hits. Invalidation: if underlying data changes (rare for historical data), use key patterns (via SCAN) to expire related keys.
    a. Cache Key Design: Use a structured key format that includes the symbol, interval, and time range to ensure uniqueness and easy retrieval. For example: `klines:{symbol}:{interval}:{startTime}:{endTime}`.
    b. Cache Expiration: Set appropriate expiration times for cached data based on the volatility of the data. For example, set a shorter expiration time for high-frequency data and a longer expiration time for low-frequency data.
    c. Cache Invalidation: Implement a mechanism to invalidate cached data when the underlying data changes. This can be done by using a versioning system or by setting up a webhook to notify the cache layer of changes in the data source.
    d. Cache Monitoring: Implement monitoring and logging for cache hits, misses, and expirations to ensure the cache layer is functioning correctly and to identify any potential issues.
    e. Cache Metrics: Collect and analyze metrics related to cache performance, such as hit rate, miss rate, and average response time, to optimize the caching strategy and improve overall system performance.
    f. Cache Testing: Implement unit tests and integration tests for the cache layer to ensure that it is functioning correctly and to catch any potential issues early in the development process.

3. Persistent Storage (Time-Series DB): Store retrieved candle data in a time-series collection or database. PostgreSQL + TimescaleDB. This improves query efficiency over ad-hoc collections. Alternatively, Redis itself can hold time-series (e.g. sorted sets with timestamp scores or RedisTimeSeries modules) if only recent data is needed. Ensure old data expires (TTL or manual purge) to bound storage.
    a. Database Schema Design: Design a schema that efficiently stores candlestick data, including fields for symbol, interval, open time, close time, open price, high price, low price, close price, volume, and any other relevant metadata. Use appropriate indexing to optimize query performance.
    b. Data Ingestion: Implement a data ingestion process that retrieves candlestick data from the Binance API and stores it in the time-series database. This process should handle any potential errors or failures gracefully and ensure data integrity.
    c. Data Retention Policy: Define a data retention policy that specifies how long candlestick data should be stored in the time-series database. Implement mechanisms to automatically purge old data based on the defined retention policy to manage storage costs and maintain performance.
    d. Query Optimization: Optimize queries to the time-series database to ensure efficient retrieval of candlestick data. This may include using appropriate indexing, query caching, and query optimization techniques to improve performance.
    e. Database Monitoring: Implement monitoring and logging for the time-series database to track performance, identify potential issues, and ensure data integrity. Collect metrics such as query response times, database load, and storage usage to optimize database performance.
    # TimescaleDB Integration: If using TimescaleDB, leverage its features such as hypertables, continuous aggregates, and compression to optimize storage and query performance for time-series data.






### TODO for each Technologies :
## PostgreSQL + TimescaleDB (as a Permanent market history)
# Should store:
a. Historical candles
b. Historical trades (if you need them)
c. Historical order book snapshots (optional)
d. Generated indicators
e. Market metadata
f. Anything that must survive restart

## Redis (as a Live memory)
# Should store:
a. Latest candle
b. Current ticker
c. Current order book
d. Latest trades
e. Frequently requested chart ranges
f. Pub/Sub streams
g. Rate limiting
h. Temporary queues


### Task TODOes
1. Retrieve candlestick data from the Binance API.
    option A: Binance REST API -> Fetcher -> TimescaleDB -> Invalidate Redis Cache
    - Example: 
        a. Fetch data from Binance API using the Klines endpoint. (BTCUSDT, 1m, Jan 1, Feb 1)
        b. Store the retrieved data in TimescaleDB for historical storage.
    option B: Binance SBE -> Market Gateway -> Decode SBE Message -> Normalize Event -> Publish Event Bus -> (Redis Cache (Clients), Persistence Worker (TimescaleDB))