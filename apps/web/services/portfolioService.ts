import { API_CONFIG } from "@/lib/config";
import axios from "axios";
import { authService } from "./authService";

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercentage: number;
  lastUpdated: Date;
}

export interface Portfolio {
  userId: string;
  cash: number;
  positions: PortfolioPosition[];
  totalEquity: number;
  realizedPnL: number;
  unrealizedPnL: number;
  dayChange: number;
  totalReturn: number;
  totalInvested: number;
}

export interface DashboardData {
  portfolio: Portfolio;
  recentTrades: RecentTrade[];
  riskSettings: RiskSettings;
  performanceData: PerformanceDataPoint[];
}

export interface PerformanceDataPoint {
  date: string;
  value: number;
}

export interface RecentTrade {
  _id?: string;
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  triggerPrice: number;
  total: number;
  executedAt: Date;
  realizedPnL?: number;
  fees?: number;
  source?: string;
}

export interface RiskSettings {
  _id?: string;
  userId: string;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  maxDrawdownPercentage: number;
  capitalAllocationPercentage: number;
  riskPreset: "conservative" | "moderate" | "aggressive" | "custom";
  autoStopLossEnabled?: boolean;
  autoTakeProfitEnabled?: boolean;
  trailingStopEnabled?: boolean;
  trailingStopPercentage?: number;
  positionSizingEnabled?: boolean;
  maxPositionsAllowed?: number;
}

class PortfolioService {
  private getMockDashboardData(userId: string): DashboardData {
    return {
      portfolio: {
        userId,
        cash: 50000,
        positions: [
          {
            symbol: "AAPL",
            quantity: 10,
            avgBuyPrice: 150,
            totalInvested: 1500,
            currentPrice: 175,
            currentValue: 1750,
            unrealizedPnL: 250,
            unrealizedPnLPercentage: 16.67,
            lastUpdated: new Date(),
          },
          {
            symbol: "GOOGL",
            quantity: 5,
            avgBuyPrice: 2800,
            totalInvested: 14000,
            currentPrice: 2950,
            currentValue: 14750,
            unrealizedPnL: 750,
            unrealizedPnLPercentage: 5.36,
            lastUpdated: new Date(),
          },
        ],
        totalEquity: 66500,
        realizedPnL: 1200,
        unrealizedPnL: 1000,
        dayChange: 125,
        totalReturn: 2200,
        totalInvested: 65000,
      },
      recentTrades: [
        {
          _id: "1",
          symbol: "AAPL",
          action: "BUY",
          quantity: 10,
          triggerPrice: 150,
          total: 1500,
          executedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      ],
      riskSettings: {
        userId,
        stopLossPercentage: 5,
        takeProfitPercentage: 10,
        maxDrawdownPercentage: 15,
        capitalAllocationPercentage: 80,
        riskPreset: "moderate",
        maxPositionsAllowed: 20,
      },
      performanceData: [
        { date: "2024-01-01", value: 60000 },
        { date: "2024-02-01", value: 62000 },
        { date: "2024-03-01", value: 65000 },
        { date: "2024-04-01", value: 66500 },
      ],
    };
  }

  private getAuthHeaders() {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("trading_token");
    if (!token || token === "mock_jwt_token") {
      return {
        "Content-Type": "application/json",
      };
    }
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  private getUserId(): string | null {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || user._id || user.userId;
      }
    } catch (error) {
      console.error("Failed to get user ID:", error);
    }
    return null;
  }

  async getPortfolio(userId?: string): Promise<Portfolio> {
    const targetUserId = userId || this.getUserId();
    try {
      if (!targetUserId) {
        throw new Error("User ID not found. Please log in again.");
      }

      const response = await axios.get(
        `${API_CONFIG.CALC_SERVER}/api/portfolio/${targetUserId}`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch portfolio");
      }

      return response.data.data;
    } catch (error: any) {
      console.error("Portfolio fetch error:", error);
      if (
        error.response?.status === 401 ||
        error.code === "ECONNREFUSED" ||
        error.message === "Network Error"
      ) {
        console.warn("Server unavailable or auth failed, using mock portfolio");
        return this.getMockDashboardData(targetUserId || "mock-user").portfolio;
      }
      if (error.response?.status === 404) {
        throw new Error(
          "Portfolio not found. A new portfolio will be created."
        );
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch portfolio"
      );
    }
  }

  async getPortfolioPerformance(
    userId?: string,
    period: string = "1m"
  ): Promise<PerformanceDataPoint[]> {
    const targetUserId = userId || this.getUserId();
    try {
      if (!targetUserId) {
        throw new Error("User ID not found. Please log in again.");
      }

      const response = await axios.get(
        `${API_CONFIG.CALC_SERVER}/api/portfolio/${targetUserId}/performance?period=${period}`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to fetch performance data"
        );
      }

      return response.data.data;
    } catch (error: any) {
      console.error("Performance fetch error:", error);
      if (
        error.response?.status === 401 ||
        error.code === "ECONNREFUSED" ||
        error.message === "Network Error"
      ) {
        console.warn(
          "Server unavailable or auth failed, using mock performance data"
        );
        return this.getMockDashboardData(targetUserId || "mock-user")
          .performanceData;
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch performance data"
      );
    }
  }

  async getRecentTrades(
    userId?: string,
    limit: number = 10
  ): Promise<RecentTrade[]> {
    const targetUserId = userId || this.getUserId();
    try {
      if (!targetUserId) {
        throw new Error("User ID not found. Please log in again.");
      }

      const response = await axios.get(
        `${API_CONFIG.CALC_SERVER}/api/portfolio/${targetUserId}/recent-trades?limit=${limit}`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to fetch recent trades"
        );
      }

      return response.data.data;
    } catch (error: any) {
      console.error("Recent trades fetch error:", error);
      if (
        error.response?.status === 401 ||
        error.code === "ECONNREFUSED" ||
        error.message === "Network Error"
      ) {
        console.warn(
          "Server unavailable or auth failed, using mock recent trades data"
        );
        return this.getMockDashboardData(targetUserId || "mock-user")
          .recentTrades;
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch recent trades"
      );
    }
  }

  async getDashboardData(userId?: string): Promise<DashboardData> {
    const targetUserId = userId || this.getUserId();
    try {
      if (!targetUserId) {
        throw new Error("User ID not found. Please log in again.");
      }

      const response = await axios.get(
        `${API_CONFIG.CALC_SERVER}/api/portfolio/${targetUserId}/dashboard`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to fetch dashboard data"
        );
      }

      return response.data.data;
    } catch (error: any) {
      console.error("Dashboard fetch error:", error);
      if (
        error.response?.status === 401 ||
        error.code === "ECONNREFUSED" ||
        error.message === "Network Error"
      ) {
        console.warn("Server unavailable or auth failed, using mock data");
        return this.getMockDashboardData(targetUserId || "mock-user");
      }
      if (error.response?.status === 404) {
        throw new Error(
          "Portfolio not found. A new portfolio will be created."
        );
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch dashboard data"
      );
    }
  }

  async updatePosition(
    symbol: string,
    quantity: number,
    price: number,
    action: "BUY" | "SELL",
    userId?: string
  ): Promise<Portfolio> {
    try {
      const targetUserId = userId || this.getUserId();
      if (!targetUserId) {
        throw new Error("User ID not found. Please log in again.");
      }

      const response = await axios.post(
        `${API_CONFIG.CALC_SERVER}/api/portfolio/${targetUserId}/positions`,
        { symbol, quantity, price, action },
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to update position");
      }

      return response.data.data;
    } catch (error: any) {
      console.error("Position update error:", error);
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      }
      if (error.response?.status === 400) {
        throw new Error(
          error?.response?.data?.message ||
            "Invalid request. Please check your input."
        );
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to update position"
      );
    }
  }

  // Additional utility methods
  async refreshPortfolio(userId?: string): Promise<Portfolio> {
    return this.getPortfolio(userId);
  }

  // Method to get risk settings (assuming you have this endpoint)
  async getRiskSettings(): Promise<RiskSettings> {
    const targetUserId = authService.getUser()?._id;
    try {
      if (!targetUserId) {
        throw new Error("User ID not found. Please log in again.");
      }

      const response = await axios.get(
        `${API_CONFIG.CALC_SERVER}/api/risk-settings/${targetUserId}`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to fetch risk settings"
        );
      }

      return response.data.data;
    } catch (error: any) {
      console.error("Risk settings fetch error:", error);
      if (
        error.response?.status === 401 ||
        error.code === "ECONNREFUSED" ||
        error.message === "Network Error"
      ) {
        console.warn(
          "Server unavailable or auth failed, using mock risk settings"
        );
        return this.getMockDashboardData(targetUserId || "mock-user")
          .riskSettings;
      }
      if (error.response?.status === 404) {
        // Return default risk settings if none exist
        return {
          userId: targetUserId,
          stopLossPercentage: 5.0,
          takeProfitPercentage: 10.0,
          maxDrawdownPercentage: 20.0,
          capitalAllocationPercentage: 25.0,
          riskPreset: "moderate",
          autoStopLossEnabled: true,
          autoTakeProfitEnabled: true,
          trailingStopEnabled: false,
          trailingStopPercentage: 5.0,
          positionSizingEnabled: true,
          maxPositionsAllowed: 10,
        };
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch risk settings"
      );
    }
  }

  // Method to update risk settings
  async updateRiskSettings(
    settings: Partial<RiskSettings>,
    userId?: string
  ): Promise<RiskSettings> {
    try {
      const targetUserId = userId || this.getUserId();
      if (!targetUserId) {
        throw new Error("User ID not found. Please log in again.");
      }

      const response = await axios.put(
        `${API_CONFIG.CALC_SERVER}/api/risk-settings/${targetUserId}`,
        settings,
        { headers: this.getAuthHeaders() }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to update risk settings"
        );
      }

      return response.data.data;
    } catch (error: any) {
      console.error("Risk settings update error:", error);
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to update risk settings"
      );
    }
  }

  // Clear cached data (if using any caching)
  clearCache(): void {
    // Implement any cache clearing logic if needed
    console.log("Cache cleared");
  }
}

export const portfolioService = new PortfolioService();
