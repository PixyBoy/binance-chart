1. API Endpoint to retrieve symbol information:
    - Endpoint: GET /api/v1/symbols
    - Description: This endpoint retrieves a list of all available symbols along with their details such as name, type, and market data.
    - Parameters:
        - `symbol` (optional): Filter by specific symbol.
        - `type` (optional): Filter by type (e.g., stock, crypto).
   - Response:
    - 200 OK: Returns a JSON array of symbol objects.
    - 400 Bad Request: Invalid parameters.
    - 404 Not Found: No symbols found.

2. API Endpoint to retrieve market data for a specific symbol:
    - Endpoint: GET /api/v1/market-data/{symbol}
    - Description: This endpoint retrieves the latest market data for a specific symbol, including price, volume, and other relevant metrics.