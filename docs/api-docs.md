### Futures API
GET /fapi/v1/exchangeInfo (provides: tick size, step size, price precision, quantity precision, status, etc.)
GET /fapi/v1/klines

<symbol>@kline_<interval>     (Required)
<symbol>@bookTicker           (Recommended) (Best Bid, Best Ask)
<symbol>@markPrice            (Recommended) (Mark Price, Funding Rate, Next Funding Time, Countdown to Funding)
<symbol>@aggTrade             (Recommended) (Price, Quantity, Trade Time, Buyer Maker)
<symbol>@depth                (Only if you need order book)
!forceOrder@arr               (Optional) (Recent liquidation orders, Long, Short)
<symbol>@miniTicker           (Optional) (24hr change, 24hr high, 24hr low, 24hr volume, 24hr quote volume)
<symbol>@ticker               (Optional)

### Spot API
GET /api/v3/exchangeInfo
GET /api/v3/klines

<symbol>@kline_<interval> (Required) (OHLC data)
<symbol>@bookTicker (Recommended) (Best Bid, Best Ask)
<symbol>@aggTrade (Recommended)
<symbol>@depth (Only if you need order book) (Price, Quantity, Bid, Ask)
<symbol>@miniTicker (Optional) (24hr change, 24hr high, 24hr low, 24hr volume, 24hr quote volume)
<symbol>@ticker (Optional)