import { API_CONFIG } from "@/lib/config";
import { authService } from "./authService";
import api from "@/lib/api";

// Strategy types
export interface StrategyCondition {
  indicator: string;
  operator: string;
  value: number;
  symbol: string;
  timeframe?: string;
  secondValue?: number;
}

export interface StrategyAction {
  type: "BUY" | "SELL" | "HOLD";
  quantity: number;
  quantityType: "percentage" | "fixed";
  symbol?: string;
  priceType?: "market" | "limit";
  limitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface StrategyRule {
  id: string;
  name?: string;
  condition: StrategyCondition;
  action: StrategyAction;
  isActive: boolean;
  priority: number;
  cooldownMinutes?: number;
  lastExecuted?: Date;
}

export interface StrategyConfig {
  riskPerTrade: number;
  stopLoss: number;
  takeProfit: number;
  maxPositions: number;
  cooldownBetweenTrades: number;
  enableRiskManagement: boolean;
  portfolioAllocation: number;
}

export interface StrategyMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  lastUpdated: Date;
}

export interface ExecutionLog {
  timestamp: Date;
  ruleId: string;
  ruleName?: string;
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  quantity: number;
  price: number;
  confidence: number;
  reason: string;
  tradeId?: string;
  status: "pending" | "executed" | "failed" | "cancelled";
  errorMessage?: string;
  profit?: number;
}

export interface Strategy {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  type: "no-code" | "code" | "ml";
  status: "active" | "inactive" | "paused" | "error";
  rules: StrategyRule[];
  config: StrategyConfig;
  metrics: StrategyMetrics;
  executionLogs: ExecutionLog[];
  isBacktested: boolean;
  backtestResults?: any;
  createdAt: Date;
  updatedAt: Date;
  lastExecuted?: Date;
  version: number;
  activeRules: StrategyRule[];
  currentPerformance: {
    netProfit: number;
    roi: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
  };
}

export interface CreateStrategyData {
  name: string;
  description?: string;
  type?: "no-code" | "code" | "ml";
  rules: StrategyRule[];
  config: StrategyConfig;
}

export interface StrategyExecutionResult {
  executions: any[];
  currentPrice: number;
  dryRun: boolean;
  activeRulesCount: number;
}

class StrategyService {
  private getUserId(): string | null {
    try {
      const user = authService.getCurrentUser();
      return user?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Normalize strategy data to ensure all properties are present
   */
  private normalizeStrategy(strategy: any): Strategy {
    return {
      ...strategy,
      rules: strategy.rules || [],
      metrics: strategy.metrics || {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalProfit: 0,
        totalLoss: 0,
        winRate: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        lastUpdated: new Date(),
      },
      currentPerformance: strategy.currentPerformance || {
        netProfit: 0,
        roi: 0,
        winRate: 0,
        profitFactor: 0,
        totalTrades: 0,
      },
      executionLogs: strategy.executionLogs || [],
      config: strategy.config || {
        riskPerTrade: 2,
        stopLoss: 5,
        takeProfit: 10,
        maxPositions: 3,
        cooldownBetweenTrades: 60,
        enableRiskManagement: true,
        portfolioAllocation: 25,
      },
      activeRules:
        strategy.activeRules ||
        strategy.rules?.filter((r: any) => r.isActive) ||
        [],
    };
  }

  /**
   * Create a new strategy
   */
  async createStrategy(strategyData: CreateStrategyData): Promise<Strategy> {
    try {
      const response = await api.post(
        `${API_CONFIG.CALC_SERVER}/api/strategies`,
        strategyData
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to create strategy");
      }

      return this.normalizeStrategy(response.data.data);
    } catch (error: any) {
      console.error("Strategy creation error:", error);
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      }
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || "Invalid strategy data");
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to create strategy"
      );
    }
  }

  /**
   * Get user's strategies
   */
  async getStrategies(params?: {
    status?: string;
    type?: string;
    limit?: number;
    page?: number;
  }): Promise<{
    strategies: Strategy[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.set("status", params.status);
      if (params?.type) queryParams.set("type", params.type);
      if (params?.limit) queryParams.set("limit", params.limit.toString());
      if (params?.page) queryParams.set("page", params.page.toString());

      const response = await api.get(
        `${API_CONFIG.CALC_SERVER}/api/strategies?${queryParams.toString()}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch strategies");
      }

      const normalizedData = {
        ...response.data.data,
        strategies:
          response.data.data.strategies?.map((strategy: any) =>
            this.normalizeStrategy(strategy)
          ) || [],
      };

      return normalizedData;
    } catch (error: any) {
      console.error("Strategies fetch error:", error);
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch strategies"
      );
    }
  }

  /**
   * Get strategy by ID
   */
  async getStrategy(id: string): Promise<Strategy> {
    try {
      const response = await api.get(
        `${API_CONFIG.CALC_SERVER}/api/strategies/${id}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch strategy");
      }

      return this.normalizeStrategy(response.data.data);
    } catch (error: any) {
      console.error("Strategy fetch error:", error);
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      }
      if (error.response?.status === 404) {
        throw new Error("Strategy not found");
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch strategy"
      );
    }
  }

  /**
   * Update strategy
   */
  async updateStrategy(
    id: string,
    updateData: Partial<CreateStrategyData>
  ): Promise<Strategy> {
    try {
      const response = await api.put(
        `${API_CONFIG.CALC_SERVER}/api/strategies/${id}`,
        updateData
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to update strategy");
      }

      return this.normalizeStrategy(response.data.data);
    } catch (error: any) {
      console.error("Strategy update error:", error);
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      }
      if (error.response?.status === 404) {
        throw new Error("Strategy not found");
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to update strategy"
      );
    }
  }

  /**
   * Delete strategy
   */
  async deleteStrategy(id: string): Promise<void> {
    try {
      const response = await api.delete(
        `${API_CONFIG.CALC_SERVER}/api/strategies/${id}`
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to delete strategy");
      }
    } catch (error: any) {
      console.error("Strategy deletion error:", error);
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      }
      if (error.response?.status === 404) {
        throw new Error("Strategy not found");
      }
      if (error.response?.status === 400) {
        throw new Error(
          error.response.data.message || "Cannot delete active strategy"
        );
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to delete strategy"
      );
    }
  }

  /**
   * Update strategy status
   */
  async updateStrategyStatus(
    id: string,
    status: "active" | "inactive" | "paused"
  ): Promise<void> {
    try {
      const response = await api.patch(
        `${API_CONFIG.CALC_SERVER}/api/strategies/${id}/status`,
        { status }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to update strategy status"
        );
      }
    } catch (error: any) {
      console.error("Strategy status update error:", error);
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      }
      if (error.response?.status === 404) {
        throw new Error("Strategy not found");
      }
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || "Invalid status change");
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to update strategy status"
      );
    }
  }

  /**
   * Get strategy execution logs
   */
  async getExecutionLogs(
    id: string,
    params?: {
      limit?: number;
      page?: number;
      status?: string;
    }
  ): Promise<{
    logs: ExecutionLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.set("limit", params.limit.toString());
      if (params?.page) queryParams.set("page", params.page.toString());
      if (params?.status) queryParams.set("status", params.status);

      const response = await api.get(
        `${API_CONFIG.CALC_SERVER}/api/strategies/${id}/logs?${queryParams.toString()}`
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to fetch execution logs"
        );
      }

      return response.data.data;
    } catch (error: any) {
      console.error("Execution logs fetch error:", error);
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch execution logs"
      );
    }
  }

  /**
   * Get strategy metrics
   */
  async getStrategyMetrics(id: string): Promise<{
    metrics: StrategyMetrics;
    performance: any;
    recentMetrics: any;
  }> {
    try {
      const response = await api.get(
        `${API_CONFIG.CALC_SERVER}/api/strategies/${id}/metrics`
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to fetch strategy metrics"
        );
      }

      return response.data.data;
    } catch (error: any) {
      console.error("Strategy metrics fetch error:", error);
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch strategy metrics"
      );
    }
  }

  /**
   * Execute strategy manually
   */
  async executeStrategy(
    id: string,
    symbol: string,
    dryRun: boolean = true
  ): Promise<StrategyExecutionResult> {
    try {
      const response = await api.post(
        `${API_CONFIG.CALC_SERVER}/api/strategies/${id}/execute`,
        { symbol, dryRun }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to execute strategy");
      }

      return response.data.data;
    } catch (error: any) {
      console.error("Strategy execution error:", error);
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to execute strategy"
      );
    }
  }

  /**
   * Get active strategies
   */
  async getActiveStrategies(): Promise<Strategy[]> {
    try {
      const response = await api.get(
        `${API_CONFIG.CALC_SERVER}/api/strategies/active`
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to fetch active strategies"
        );
      }

      return response.data.data;
    } catch (error: any) {
      console.error("Active strategies fetch error:", error);
      if (error.response?.status === 401) {
        throw new Error("Authentication required. Please log in again.");
      }
      throw new Error(
        error?.response?.data?.message ||
          error.message ||
          "Failed to fetch active strategies"
      );
    }
  }

  /**
   * Create default strategy config
   */
  createDefaultConfig(): StrategyConfig {
    return {
      riskPerTrade: 5,
      stopLoss: 5,
      takeProfit: 10,
      maxPositions: 5,
      cooldownBetweenTrades: 60,
      enableRiskManagement: true,
      portfolioAllocation: 50,
    };
  }

  /**
   * Validate strategy rule
   */
  validateRule(rule: StrategyRule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.condition.indicator) {
      errors.push("Indicator is required");
    }

    if (!rule.condition.operator) {
      errors.push("Operator is required");
    }

    if (rule.condition.value === undefined || rule.condition.value === null) {
      errors.push("Condition value is required");
    }

    if (!rule.condition.symbol) {
      errors.push("Symbol is required");
    }

    if (!rule.action.type) {
      errors.push("Action type is required");
    }

    if (rule.action.quantity <= 0) {
      errors.push("Quantity must be greater than 0");
    }

    if (
      rule.action.quantityType === "percentage" &&
      rule.action.quantity > 100
    ) {
      errors.push("Percentage quantity cannot exceed 100%");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate strategy config
   */
  validateConfig(config: StrategyConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.riskPerTrade <= 0 || config.riskPerTrade > 100) {
      errors.push("Risk per trade must be between 0.1% and 100%");
    }

    if (config.stopLoss <= 0 || config.stopLoss > 50) {
      errors.push("Stop loss must be between 0.1% and 50%");
    }

    if (config.takeProfit <= 0 || config.takeProfit > 100) {
      errors.push("Take profit must be between 0.1% and 100%");
    }

    if (config.maxPositions <= 0 || config.maxPositions > 20) {
      errors.push("Max positions must be between 1 and 20");
    }

    if (config.portfolioAllocation <= 0 || config.portfolioAllocation > 100) {
      errors.push("Portfolio allocation must be between 1% and 100%");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const strategyService = new StrategyService();
