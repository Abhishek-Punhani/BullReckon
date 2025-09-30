import axios from "axios";
import { API_CONFIG } from "../lib/config";

export const marketService = {
  async getQuote(symbol: string) {
    try {
      const response = await axios.get(
        `${API_CONFIG.MARKET_SERVER}/api/market/quote/${symbol}`
      );
      return response.data;
    } catch {
      throw new Error(`Failed to fetch quote for ${symbol}`);
    }
  },

  async searchSymbols(query: string) {
    try {
      const response = await axios.get(
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
      const response = await axios.get(
        `${API_CONFIG.MARKET_SERVER}/api/market/historical/${symbol}?period=${period}&interval=${interval}`
      );
      const json = response.data;
      return json && json.data ? json.data : json;
    } catch {
      throw new Error(`Failed to fetch historical data for ${symbol}`);
    }
  },

  async getTrendingStocks() {
    try {
      const response = await axios.get(
        `${API_CONFIG.MARKET_SERVER}/api/market/trending`
      );
      return response.data;
    } catch {
      throw new Error("Failed to fetch trending stocks");
    }
  },

  async getMarketSummary() {
    try {
      const response = await axios.get(
        `${API_CONFIG.MARKET_SERVER}/api/market/summary`
      );
      return response.data;
    } catch {
      throw new Error("Failed to fetch market summary");
    }
  },

  async getMultipleQuotes(symbols: string[]) {
    try {
      const response = await axios.post(
        `${API_CONFIG.MARKET_SERVER}/api/market/quotes`,
        { symbols }
      );
      return response.data;
    } catch {
      throw new Error("Failed to fetch multiple quotes");
    }
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
};
