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

class MarketService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
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
    try {
      const cacheKey = `historical_${symbol.toUpperCase()}_${period}`;
      const cached = this.getCachedData(cacheKey);

      if (cached) {
        return cached;
      }

      const result = await yahooFinance.historical(symbol, {
        period1: this.getPeriodStartDate(period),
        period2: new Date(),
        interval: "1d",
      });

      if (!result || result.length === 0) {
        throw new ErrorHandling(
          `No historical data found for '${symbol}'`,
          404
        );
      }

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

      // Cache historical data for longer (5 minutes)
      this.setCachedData(cacheKey, historicalData, 5 * 60 * 1000);
      return historicalData;
    } catch (error: any) {
      if (error instanceof ErrorHandling) {
        throw error;
      }
      console.error(`Error fetching historical data for ${symbol}:`, error);
      throw new ErrorHandling(
        `Failed to fetch historical data for ${symbol}`,
        500
      );
    }
  }

  /**
   * Search for stocks by query
   */
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
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key); // Remove expired cache
    }
    return null;
  }

  private setCachedData(key: string, data: any, duration?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
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
}

export const marketService = new MarketService();
