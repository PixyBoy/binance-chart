-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('spot', 'futures');

-- CreateTable
CREATE TABLE "kline_1m" (
    "exchange" TEXT NOT NULL,
    "marketType" "MarketType" NOT NULL,
    "symbol" TEXT NOT NULL,
    "openTime" TIMESTAMP(3) NOT NULL,
    "closeTime" TIMESTAMP(3) NOT NULL,
    "open" TEXT NOT NULL,
    "high" TEXT NOT NULL,
    "low" TEXT NOT NULL,
    "close" TEXT NOT NULL,
    "volume" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kline_1m_pkey" PRIMARY KEY ("exchange","marketType","symbol","openTime")
);

-- CreateTable
CREATE TABLE "ingestion_cursor" (
    "exchange" TEXT NOT NULL,
    "marketType" "MarketType" NOT NULL,
    "symbol" TEXT NOT NULL,
    "lastCloseTime" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestion_cursor_pkey" PRIMARY KEY ("exchange","marketType","symbol")
);

-- CreateIndex
CREATE INDEX "kline_1m_symbol_openTime_idx" ON "kline_1m"("symbol", "openTime");
