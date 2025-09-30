import { API_CONFIG } from "@/lib/config";
import axios from "axios";

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
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  triggerPrice: number;
  total: number;
  executedAt: Date;
  realizedPnL?: number;
}

export interface RiskSettings {
  stopLossPercentage: number;
  takeProfitPercentage: number;
  maxDrawdownPercentage: number;
  capitalAllocationPercentage: number;
  riskPreset: "conservative" | "moderate" | "aggressive" | "custom";
}

class PortfolioService {
  private getAuthHeaders() {
    const token = localStorage.getItem("access_token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async getPortfolio(userId: string): Promise<Portfolio> {
    try {
      const response = await axios.get(
        `${API_CONFIG.API_SERVER}/api/portfolio/${userId}`,
        { headers: this.getAuthHeaders() }
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message || "Failed to fetch portfolio"
      );
    }
  }

  async getPortfolioPerformance(
    userId: string,
    period: string = "1m"
  ): Promise<PerformanceDataPoint[]> {
    try {
      const response = await axios.get(
        `${API_CONFIG.API_SERVER}/api/portfolio/${userId}/performance?period=${period}`,
        { headers: this.getAuthHeaders() }
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message || "Failed to fetch performance data"
      );
    }
  }

  async getRecentTrades(
    userId: string,
    limit: number = 10
  ): Promise<RecentTrade[]> {
    try {
      const response = await axios.get(
        `${API_CONFIG.API_SERVER}/api/portfolio/${userId}/recent-trades?limit=${limit}`,
        { headers: this.getAuthHeaders() }
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message || "Failed to fetch recent trades"
      );
    }
  }

  async getDashboardData(userId: string): Promise<DashboardData> {
    try {
      const response = await axios.get(
        `${API_CONFIG.API_SERVER}/api/portfolio/${userId}/dashboard`,
        { headers: this.getAuthHeaders() }
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message || "Failed to fetch dashboard data"
      );
    }
  }

  async updatePosition(
    userId: string,
    symbol: string,
    quantity: number,
    price: number,
    action: "BUY" | "SELL"
  ): Promise<Portfolio> {
    try {
      const response = await axios.post(
        `${API_CONFIG.API_SERVER}/api/portfolio/${userId}/positions`,
        { symbol, quantity, price, action },
        { headers: this.getAuthHeaders() }
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message || "Failed to update position"
      );
    }
  }
}

export const portfolioService = new PortfolioService();
