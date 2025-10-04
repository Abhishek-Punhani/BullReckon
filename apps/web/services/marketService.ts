import api from "@/lib/api";
import { API_CONFIG } from "../lib/config";

export const marketService = {
  // Test if market server is available
  async testConnection() {
    try {
      const response = await api.get(
        `${API_CONFIG.MARKET_SERVER}/api/market/health`,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      console.error("Market server connection failed:", error);
      return null;
    }
  },

  getSymbolName(symbol: string) {
    const names: Record<string, string> = {
      AAPL: "Apple Inc.",
      MSFT: "Microsoft Corporation",
      GOOGL: "Alphabet Inc.",
      AMZN: "Amazon.com Inc.",
      TSLA: "Tesla Inc.",
      NVDA: "NVIDIA Corporation",
      SPX: "S&P 500",
      NASDAQ: "NASDAQ Composite",
      DJI: "Dow Jones Industrial Average",
      NIFTY50: "NIFTY 50",
      "BTC-USD": "Bitcoin USD",
      "ETH-USD": "Ethereum USD",
      "GC=F": "Gold Futures",
      "SI=F": "Silver Futures",
      "CL=F": "Crude Oil Futures",
    };
    return names[symbol] || symbol;
  },

  async getQuote(symbol: string) {
    try {
      const response = await api.get(
        `${API_CONFIG.MARKET_SERVER}/api/market/quote/${symbol}`
      );
      return response.data;
    } catch (error: any) {
      console.error(`Failed to fetch quote for ${symbol}:`, error);

      // Return null for failed requests so other symbols can still load
      if (error.response?.status === 422) {
        console.warn(`Symbol ${symbol} not supported by data provider`);
        return null;
      }

      throw error;
    }
  },

  async searchSymbols(query: string) {
    try {
      const response = await api.get(
        `${API_CONFIG.MARKET_SERVER}/api/market/search?q=${encodeURIComponent(query)}`
      );
      return response.data;
    } catch {
      throw new Error(`Search failed for query: ${query}`);
    }
  },

  async getHistoricalData(
    symbol: string,
    period: string = "1y",
    interval: string = "1d"
  ) {
    try {
      const response = await api.get(
        `${API_CONFIG.MARKET_SERVER}/api/market/historical/${symbol}?period=${period}&interval=${interval}`
      );
      const json = response.data;
      return json && json.data ? json.data : json;
    } catch (error) {
      console.error(`Failed to fetch historical data for ${symbol}:`, error);
      throw error;
    }
  },

  async getTrendingStocks() {
    try {
      const response = await api.get(
        `${API_CONFIG.MARKET_SERVER}/api/market/trending`
      );
      return response.data;
    } catch {
      throw new Error("Failed to fetch trending stocks");
    }
  },

  async getMarketSummary() {
    try {
      const response = await api.get(
        `${API_CONFIG.MARKET_SERVER}/api/market/summary`
      );
      return response.data;
    } catch {
      throw new Error("Failed to fetch market summary");
    }
  },

  async getMultipleQuotes(symbols: string[]) {
    try {
      const response = await api.post(
        `${API_CONFIG.MARKET_SERVER}/api/market/quotes`,
        { symbols }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch multiple quotes:`, error);
      throw error;
    }
  },

  // Efficient batch fetching method
  async getBatchQuotes(symbols: string[]) {
    try {
      // Try batch API first
      const batchData = await this.getMultipleQuotes(symbols);
      if (Array.isArray(batchData)) {
        return batchData;
      }
    } catch (error) {
      console.warn("Batch API failed, falling back to individual requests");
    }

    // Fallback to individual requests with concurrency limit
    const results = [];
    const BATCH_SIZE = 5; // Limit concurrent requests

    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (symbol) => {
        try {
          const result = await this.getQuote(symbol);
          return result;
        } catch (error) {
          console.warn(`Failed to get quote for ${symbol}, skipping`);
          return null;
        }
      });
      const batchResults = await Promise.allSettled(batchPromises);

      results.push(
        ...batchResults
          .filter(
            (result) => result.status === "fulfilled" && result.value !== null
          )
          .map((result) => (result as PromiseFulfilledResult<any>).value)
      );
    }

    return results;
  },

  // Cache for frequently accessed data
  cache: new Map(),

  async getCachedQuote(symbol: string, maxAge: number = 30000) {
    const cacheKey = `quote_${symbol}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.data;
    }

    const data = await this.getQuote(symbol);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  },

  async getCompanyInfo(symbol: string) {
    try {
      const response = await api.get(
        `${API_CONFIG.MARKET_SERVER}/api/market/company/${symbol}`
      );
      return response.data;
    } catch (error: any) {
      console.error(`Failed to fetch company info for ${symbol}:`, error);
      return null;
    }
  },

  /**
   * Get user's holdings for a specific symbol
   */
  async getHoldings(symbol: string) {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = user.id || user._id;
      const token = localStorage.getItem("access_token");

      if (!userId || !token) {
        return null;
      }

      const response = await api.get(
        `${API_CONFIG.CALC_SERVER}/api/portfolio/${userId}/holding/${symbol}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        return response.data.data || null;
      }

      return null;
    } catch (error: any) {
      console.error(`Failed to fetch holdings for ${symbol}:`, error);
      return null;
    }
  },
};
