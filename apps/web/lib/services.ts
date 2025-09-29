import { API_CONFIG } from "./config";
import axios from "axios";

// Auth service functions
export const authService = {
  async login(email: string, password: string) {
    try {
      const response = await axios.post(
        `${API_CONFIG.AUTH_SERVER}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      const result = response.data;

      // Store auth data
      if (typeof window !== "undefined" && result.accessToken) {
        localStorage.setItem("access_token", result.accessToken);
        localStorage.setItem("user", JSON.stringify(result.user));
      }

      return result;
    } catch (error: any) {
      throw new Error(error?.response?.data || "Login failed");
    }
  },

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    photoUrl?: string
  ) {
    try {
      const response = await axios.post(
        `${API_CONFIG.AUTH_SERVER}/api/auth/register`,
        {
          firstName,
          lastName,
          email,
          password,
          photo: photoUrl,
        },
        { withCredentials: true }
      );
      const result = response.data;

      // Store auth data
      if (typeof window !== "undefined" && result.accessToken) {
        localStorage.setItem("access_token", result.accessToken);
        localStorage.setItem("user", JSON.stringify(result.user));
      }

      return result;
    } catch (error: any) {
      throw new Error(error?.response?.data || "Registration failed");
    }
  },

  async logout() {
    try {
      await axios.post(
        `${API_CONFIG.AUTH_SERVER}/api/auth/logout`,
        {},
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${this.getToken()}`,
          },
        }
      );
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Clear stored data
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }
  },

  async validateToken(token: string) {
    const response = await axios.get(
      `${API_CONFIG.AUTH_SERVER}/api/auth/validate`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  async refreshToken() {
    try {
      const response = await axios.post(
        `${API_CONFIG.AUTH_SERVER}/api/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const result = response.data;
      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", result.accessToken);
      }
      return result;
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
    return null;
  },

  getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token");
    }
    return null;
  },

  getUser() {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch (error) {
          console.error("Failed to parse user from localStorage:", error);
        }
      }
    }
    return null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  async googleLogin(credentialResponse: { credential: string }) {
    try {
      const response = await axios.post(
        `${API_CONFIG.AUTH_SERVER}/api/auth/google-login`,
        { credential: credentialResponse.credential },
        { withCredentials: true }
      );
      const result = response.data;

      if (typeof window !== "undefined" && result.accessToken) {
        localStorage.setItem("access_token", result.accessToken);
        localStorage.setItem("user", JSON.stringify(result.user));
      }

      return {
        isNewUser: result.isNewUser || !result.user?.isEmailVerified,
        user: result.user,
      };
    } catch (error: any) {
      const message =
        error?.response?.data ||
        (error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : "Google Login failed, Please try again");
      throw new Error(message);
    }
  },
};

// Market data service functions
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

// Calculation service functions
export const calcService = {
  async getRiskSettings( token: string) {
    const response = await axios.get(
      `${API_CONFIG.CALC_SERVER}/api/risk-settings/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  async updateRiskSettings(settings: any, token: string) {
    const response = await axios.post(
      `${API_CONFIG.CALC_SERVER}/api/risk-settings/`,
      settings,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  async executeTrade(tradeData: any, token: string) {
    const response = await axios.post(
      `${API_CONFIG.CALC_SERVER}/api/trades`,
      tradeData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};

// API service functions
export const apiService = {
  async getPortfolio(userId: string, token: string) {
    const response = await axios.get(
      `${API_CONFIG.API_SERVER}/api/portfolio/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  async getTradeHistory(userId: string, token: string) {
    const response = await axios.get(
      `${API_CONFIG.API_SERVER}/api/trades/history/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};
