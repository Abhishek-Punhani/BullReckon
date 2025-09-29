import { API_CONFIG } from "./config";

// Auth service functions
export const authService = {
  async login(email: string, password: string) {
    const response = await fetch(`${API_CONFIG.AUTH_SERVER}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Login failed");
    }

    const result = await response.json();

    // Store auth data
    if (typeof window !== "undefined" && result.accessToken) {
      localStorage.setItem("access_token", result.accessToken);
      localStorage.setItem("user", JSON.stringify(result.user));
    }

    return result;
  },

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    photoUrl?: string
  ) {
    const response = await fetch(
      `${API_CONFIG.AUTH_SERVER}/api/auth/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          photo: photoUrl, // optional
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Registration failed");
    }

    const result = await response.json();

    // Store auth data
    if (typeof window !== "undefined" && result.accessToken) {
      localStorage.setItem("access_token", result.accessToken);
      localStorage.setItem("user", JSON.stringify(result.user));
    }

    return result;
  },

  async logout() {
    try {
      await fetch(`${API_CONFIG.AUTH_SERVER}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${this.getToken()}`,
        },
      });
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
    const response = await fetch(
      `${API_CONFIG.AUTH_SERVER}/api/auth/validate`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.json();
  },

  async refreshToken() {
    try {
      const response = await fetch(
        `${API_CONFIG.AUTH_SERVER}/api/auth/refresh`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", result.accessToken);
        }
        return result;
      }
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
      const response = await fetch(
        `${API_CONFIG.AUTH_SERVER}/api/auth/google-login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            credential: credentialResponse.credential,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Google Login failed, Please try again");
      }

      const result = await response.json();

      if (typeof window !== "undefined" && result.accessToken) {
        localStorage.setItem("access_token", result.accessToken);
        localStorage.setItem("user", JSON.stringify(result.user));
      }

      return {
        isNewUser: result.isNewUser || !result.user?.isEmailVerified,
        user: result.user,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : "Google Login failed, Please try again";
      throw new Error(message);
    }
  },
};

// Market data service functions
export const marketService = {
  async getQuote(symbol: string) {
    const response = await fetch(
      `${API_CONFIG.MARKET_SERVER}/api/market/quote/${symbol}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch quote for ${symbol}`);
    }
    return response.json();
  },

  async searchSymbols(query: string) {
    const response = await fetch(
      `${API_CONFIG.MARKET_SERVER}/api/market/search?q=${encodeURIComponent(query)}`
    );
    if (!response.ok) {
      throw new Error(`Search failed for query: ${query}`);
    }
    return response.json();
  },

  async getHistoricalData(
    symbol: string,
    period: string = "1y",
    interval: string = "1d"
  ) {
    const response = await fetch(
      `${API_CONFIG.MARKET_SERVER}/api/market/historical/${symbol}?period=${period}&interval=${interval}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch historical data for ${symbol}`);
    }
    const json = await response.json();
    // API returns an envelope { success, data, message }, unwrap if present
    return json && json.data ? json.data : json;
  },

  async getTrendingStocks() {
    const response = await fetch(
      `${API_CONFIG.MARKET_SERVER}/api/market/trending`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch trending stocks");
    }
    return response.json();
  },

  async getMarketSummary() {
    const response = await fetch(
      `${API_CONFIG.MARKET_SERVER}/api/market/summary`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch market summary");
    }
    return response.json();
  },

  async getMultipleQuotes(symbols: string[]) {
    const response = await fetch(
      `${API_CONFIG.MARKET_SERVER}/api/market/quotes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbols }),
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch multiple quotes");
    }
    return response.json();
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
  async getRiskSettings(userId: string, token: string) {
    const response = await fetch(
      `${API_CONFIG.CALC_SERVER}/api/risk-settings/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.json();
  },

  async updateRiskSettings(userId: string, settings: any, token: string) {
    const response = await fetch(
      `${API_CONFIG.CALC_SERVER}/api/risk-settings/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      }
    );
    return response.json();
  },

  async executeTrade(tradeData: any, token: string) {
    const response = await fetch(`${API_CONFIG.CALC_SERVER}/api/trades`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(tradeData),
    });
    return response.json();
  },
};

// API service functions
export const apiService = {
  async getPortfolio(userId: string, token: string) {
    const response = await fetch(
      `${API_CONFIG.API_SERVER}/api/portfolio/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.json();
  },

  async getTradeHistory(userId: string, token: string) {
    const response = await fetch(
      `${API_CONFIG.API_SERVER}/api/trades/history/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.json();
  },
};
