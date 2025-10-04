import yahooFinance from "yahoo-finance2";
import { ErrorHandling } from "../../../middleware/errorHandler";

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  timestamp: string;
}

export interface StockHistoricalData {
  symbol: string;
  period: string;
  data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export interface BacktestHistoricalData {
  symbol: string;
  interval: string;
  start: string;
  end: string;
  data: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

class MarketService {
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();
  private priceTimestamps: Map<string, number> = new Map(); // Track when prices were actually fetched
  private readonly CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds

  /**
   * Get real-time stock quote
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    try {
      const cacheKey = `quote_${symbol.toUpperCase()}`;
      const cached = this.getCachedData(cacheKey);

      if (cached) {
        return cached;
      }

      const quote = await yahooFinance.quote(symbol);

      if (!quote) {
        throw new ErrorHandling(`Stock symbol '${symbol}' not found`, 404);
      }

      const stockQuote: StockQuote = {
        symbol: quote.symbol || symbol.toUpperCase(),
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        dayHigh: quote.regularMarketDayHigh || 0,
        dayLow: quote.regularMarketDayLow || 0,
        volume: quote.regularMarketVolume || 0,
        marketCap: quote.marketCap,
        pe: quote.trailingPE,
        timestamp: new Date().toISOString(),
      };

      this.setCachedData(cacheKey, stockQuote);

      // Track when this price was actually fetched (not from cache)
      this.priceTimestamps.set(symbol.toUpperCase(), Date.now());

      return stockQuote;
    } catch (error: any) {
      if (error instanceof ErrorHandling) {
        throw error;
      }
      console.error(`Error fetching quote for ${symbol}:`, error);
      throw new ErrorHandling(`Failed to fetch stock data for ${symbol}`, 500);
    }
  }

  /**
   * Get historical stock data
   */
  async getHistoricalData(
    symbol: string,
    period:
      | "1d"
      | "5d"
      | "1mo"
      | "3mo"
      | "6mo"
      | "1y"
      | "2y"
      | "5y"
      | "10y"
      | "ytd"
      | "max" = "1mo"
  ): Promise<StockHistoricalData> {
    const cacheKey = `historical_${symbol.toUpperCase()}_${period}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    // Helper to convert raw yahoo result to our shape
    const normalizeResult = (result: any[]): StockHistoricalData => {
      const historicalData: StockHistoricalData = {
        symbol: symbol.toUpperCase(),
        period,
        data: result
          .map((item: any) => ({
            date: item.date.toISOString().split("T")[0],
            open: item.open || 0,
            high: item.high || 0,
            low: item.low || 0,
            close: item.close || 0,
            volume: item.volume || 0,
          }))
          .sort(
            (a: any, b: any) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
          ),
      };
      return historicalData;
    };

    // Try multiple strategies: direct Yahoo fetch and symbol normalization (USDT->-USD).
    // Note: synthetic fallback removed — service will return an error if provider has no data.
    try {
      let result: any = null;

      // Primary attempt using the provided symbol
      try {
        result = await yahooFinance.historical(symbol, {
          period1: this.getPeriodStartDate(period),
          period2: new Date(),
          interval: "1d",
        });
      } catch (yErr) {
        console.warn(
          `Primary yahoo.historical lookup failed for ${symbol}: ${yErr}`
        );
      }

      // If no usable result, try common normalization for crypto pairs (USDT -> -USD)
      if (!result || (Array.isArray(result) && result.length === 0)) {
        try {
          const up = String(symbol).toUpperCase();
          if (up.endsWith("USDT")) {
            const alt = up.replace(/USDT$/i, "-USD");
            console.info(`Trying alternate symbol for Yahoo: ${alt}`);
            result = await yahooFinance.historical(alt, {
              period1: this.getPeriodStartDate(period),
              period2: new Date(),
              interval: "1d",
            });
          }
        } catch (altErr) {
          console.warn(
            `Alternate yahoo.historical lookup failed for ${symbol}: ${altErr}`
          );
        }
      }

      // Some Yahoo responses can be nested or empty; normalize to an array if possible
      const resultArray = Array.isArray(result) ? result : result?.prices || [];

      if (resultArray && resultArray.length > 0) {
        const historicalData = normalizeResult(resultArray);
        // Cache historical data for longer (5 minutes)
        this.setCachedData(cacheKey, historicalData, 5 * 60 * 1000);
        return historicalData;
      }

      // Yahoo returned no usable data — per request, do NOT synthesize data; return explicit error.
      console.warn(
        `No historical data from Yahoo for ${symbol} (period=${period})`
      );
      throw new ErrorHandling(
        `No historical data available from provider for ${symbol}`,
        502
      );
    } catch (error: any) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      // Bubble up a provider error rather than synthesizing data
      if (error instanceof ErrorHandling) throw error;
      throw new ErrorHandling(
        `Failed to fetch historical data for ${symbol}: ${error?.message || String(error)}`,
        502
      );
    }
  }

  /**
   * Get historical stock data for backtest with specific interval and date range
   */
  async getHistoricalDataForBacktest(
    symbol: string,
    interval: string,
    startDate: Date,
    endDate: Date
  ): Promise<BacktestHistoricalData> {
    const cacheKey = `backtest_${symbol.toUpperCase()}_${interval}_${startDate.getTime()}_${endDate.getTime()}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Map our intervals to Yahoo Finance intervals
      const yahooIntervalMap: Record<string, string> = {
        "1m": "1m",
        "5m": "5m",
        "15m": "15m",
        "30m": "30m",
        "1h": "1h",
        "1d": "1d",
      };

      const yahooInterval = yahooIntervalMap[interval] || "1d";

      let result: any = null;

      // Primary attempt using the provided symbol
      try {
        result = await yahooFinance.historical(symbol, {
          period1: startDate,
          period2: endDate,
          interval: yahooInterval as any,
        });
      } catch (yErr) {
        console.warn(
          `Primary yahoo.historical lookup failed for ${symbol}: ${yErr}`
        );
      }

      // If no usable result, try common normalization for crypto pairs (USDT -> -USD)
      if (!result || (Array.isArray(result) && result.length === 0)) {
        try {
          const up = String(symbol).toUpperCase();
          if (up.endsWith("USDT")) {
            const alt = up.replace(/USDT$/i, "-USD");
            console.info(`Trying alternate symbol for Yahoo: ${alt}`);
            result = await yahooFinance.historical(alt, {
              period1: startDate,
              period2: endDate,
              interval: yahooInterval as any,
            });
          }
        } catch (altErr) {
          console.warn(
            `Alternate yahoo.historical lookup failed for ${symbol}: ${altErr}`
          );
        }
      }

      // Some Yahoo responses can be nested or empty; normalize to an array if possible
      const resultArray = Array.isArray(result) ? result : result?.prices || [];

      if (resultArray && resultArray.length > 0) {
        const backtestData: BacktestHistoricalData = {
          symbol: symbol.toUpperCase(),
          interval,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          data: resultArray
            .map((item: any) => ({
              timestamp: item.date.toISOString(),
              open: item.open || 0,
              high: item.high || 0,
              low: item.low || 0,
              close: item.close || 0,
              volume: item.volume || 0,
            }))
            .sort(
              (a: any, b: any) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
            ),
        };

        // Cache backtest data for longer (10 minutes)
        this.setCachedData(cacheKey, backtestData, 10 * 60 * 1000);
        return backtestData;
      }

      // Yahoo returned no usable data
      console.warn(
        `No backtest historical data from Yahoo for ${symbol} (interval=${interval}, ${startDate.toISOString()} to ${endDate.toISOString()})`
      );
      throw new ErrorHandling(
        `No historical data available from provider for ${symbol} in the specified date range`,
        502
      );
    } catch (error: any) {
      console.error(
        `Error fetching backtest historical data for ${symbol}:`,
        error
      );
      if (error instanceof ErrorHandling) throw error;
      throw new ErrorHandling(
        `Failed to fetch backtest historical data for ${symbol}: ${error?.message || String(error)}`,
        502
      );
    }
  }

  async searchStocks(
    query: string
  ): Promise<Array<{ symbol: string; name: string; type: string }>> {
    try {
      const cacheKey = `search_${query.toLowerCase()}`;
      const cached = this.getCachedData(cacheKey);

      if (cached) {
        return cached;
      }

      const searchResults = await yahooFinance.search(query);

      const results = searchResults.quotes
        .filter((quote: any) => quote.typeDisp === "Equity")
        .slice(0, 10) // Limit to top 10 results
        .map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.longname || quote.shortname || quote.symbol,
          type: quote.typeDisp || "Equity",
        }));

      // Cache search results for longer (10 minutes)
      this.setCachedData(cacheKey, results, 10 * 60 * 1000);
      return results;
    } catch (error: any) {
      console.error(`Error searching stocks with query '${query}':`, error);
      throw new ErrorHandling(`Failed to search stocks`, 500);
    }
  }

  /**
   * Get multiple stock quotes at once
   */
  async getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
    try {
      const quotes = await Promise.allSettled(
        symbols.map((symbol) => this.getStockQuote(symbol))
      );

      return quotes
        .filter(
          (result): result is PromiseFulfilledResult<StockQuote> =>
            result.status === "fulfilled"
        )
        .map((result) => result.value);
    } catch (error: any) {
      console.error("Error fetching multiple quotes:", error);
      throw new ErrorHandling("Failed to fetch multiple stock quotes", 500);
    }
  }

  /**
   * Cache management
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (cached.expiresAt > Date.now()) return cached.data;
    // expired
    this.cache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any, duration?: number): void {
    const ttl = typeof duration === "number" ? duration : this.CACHE_DURATION;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    const periods: Record<string, number> = {
      "1d": 1,
      "5d": 5,
      "1mo": 30,
      "3mo": 90,
      "6mo": 180,
      "1y": 365,
      "2y": 730,
      "5y": 1825,
      "10y": 3650,
      ytd: Math.floor(
        (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) /
          (1000 * 60 * 60 * 24)
      ),
      max: 7300, // ~20 years
    };

    const days = periods[period] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return startDate;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Get live prices for long polling
   * Returns prices with timestamp comparison for change detection
   */
  async getLivePrices(
    symbols: string[],
    lastUpdateTime: number = 0
  ): Promise<{
    prices: Record<string, StockQuote>;
    timestamp: number;
    hasUpdates: boolean;
  }> {
    try {
      const currentTime = Date.now();
      const prices: Record<string, StockQuote> = {};
      let hasUpdates = false;

      console.log(
        `📊 [Market Service] getLivePrices called - symbols: ${symbols.join(",")}, lastUpdateTime: ${lastUpdateTime}`
      );

      // Fetch quotes for all symbols
      const quotePromises = symbols.map(async (symbol) => {
        try {
          const quote = await this.getStockQuote(symbol);
          return { symbol: symbol.toUpperCase(), quote };
        } catch (error) {
          console.warn(`Failed to fetch quote for ${symbol}:`, error);
          return null;
        }
      });

      const results = await Promise.allSettled(quotePromises);

      // Process results
      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          const { symbol, quote } = result.value;
          prices[symbol] = quote;

          // Check if this price was fetched AFTER the client's lastUpdateTime
          const priceFetchTime = this.priceTimestamps.get(symbol) || 0;
          console.log(
            `📊 [Market Service] ${symbol} - priceFetchTime: ${priceFetchTime}, lastUpdateTime: ${lastUpdateTime}, hasUpdate: ${priceFetchTime > lastUpdateTime}`
          );

          if (priceFetchTime > lastUpdateTime) {
            hasUpdates = true;
          }
        }
      }

      // On first call (lastUpdateTime === 0), always return updates
      if (lastUpdateTime === 0) {
        hasUpdates = true;
        console.log(
          `📊 [Market Service] First call detected, forcing hasUpdates=true`
        );
      }

      console.log(
        `📊 [Market Service] Returning ${Object.keys(prices).length} prices, hasUpdates: ${hasUpdates}, timestamp: ${currentTime}`
      );

      return {
        prices,
        timestamp: currentTime,
        hasUpdates,
      };
    } catch (error: any) {
      console.error("Error fetching live prices:", error);
      throw new ErrorHandling("Failed to fetch live prices", 500);
    }
  }

  /**
   * Get company information (using Yahoo Finance quoteSummary)
   */
  async getCompanyInfo(symbol: string): Promise<{
    profile?: any;
    financialData?: any;
    summaryStats?: any;
  }> {
    try {
      const cacheKey = `company_${symbol.toUpperCase()}`;
      const cached = this.getCachedData(cacheKey);

      if (cached) {
        return cached;
      }

      // Fetch company information from Yahoo Finance
      const modules = [
        "assetProfile",
        "financialData",
        "defaultKeyStatistics",
      ] as ("assetProfile" | "financialData" | "defaultKeyStatistics")[];
      const result = await yahooFinance.quoteSummary(symbol, { modules });

      const companyInfo = {
        profile: result.assetProfile,
        financialData: result.financialData,
        summaryStats: result.defaultKeyStatistics,
      };

      // Cache company info for longer (30 minutes)
      this.setCachedData(cacheKey, companyInfo, 30 * 60 * 1000);
      return companyInfo;
    } catch (error: any) {
      console.error(`Error fetching company info for ${symbol}:`, error);
      // Return empty object instead of throwing error
      return {};
    }
  }
}

export const marketService = new MarketService();
