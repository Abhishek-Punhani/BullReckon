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
  private getAuthHeaders() {
    const token = localStorage.getItem("access_token");
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
    try {
      const targetUserId = userId || this.getUserId();
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
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
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
    try {
      const targetUserId = userId || this.getUserId();
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
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
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
    try {
      const targetUserId = userId || this.getUserId();
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
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch recent trades"
      );
    }
  }

  async getDashboardData(userId?: string): Promise<DashboardData> {
    try {
      const targetUserId = userId || this.getUserId();
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
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
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
    const targetUserId = authService.getUser()._id;
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
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
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
