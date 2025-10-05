import {
  Strategy,
  IStrategy,
  IRule,
  ICondition,
  IAction,
  IExecutionLog,
} from "../models";
import { Trade, ITrade } from "../models";
import { internalApi } from "../../../shared/internalApi.client";
import mongoose from "mongoose";

export interface ExecutionResult {
  success: boolean;
  action?: "BUY" | "SELL" | "HOLD";
  signal?: StrategySignal | null;
  error?: string;
  executedTrades?: ITrade[];
}

export interface StrategySignal {
  action: "BUY" | "SELL" | "HOLD";
  symbol: string;
  quantity: number;
  confidence: number;
  reason: string;
  price?: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
}

export class StrategyExecutionService {
  private readonly MARKET_SERVER_URL: string;

  constructor() {
    this.MARKET_SERVER_URL =
      process.env.MARKET_SERVER_URL || "http://localhost:5000";
  }

  async executeStrategy(
    strategy: IStrategy,
    marketData?: Record<string, MarketData>
  ): Promise<ExecutionResult> {
    try {
      // Check if strategy is active
      if (strategy.status !== "active") {
        return {
          success: false,
          error: "Strategy is not active",
        };
      }

      // Evaluate strategy rules
      const signal = await this.evaluateRules(strategy, marketData);

      if (!signal || signal.action === "HOLD") {
        return {
          success: true,
          action: "HOLD",
          signal,
        };
      }

      // Execute trades based on signal
      const executedTrades = await this.executeTrades(strategy, signal);

      // Update strategy metrics and logs
      await this.updateStrategyAfterExecution(strategy, signal, executedTrades);

      return {
        success: true,
        action: signal.action,
        signal,
        executedTrades,
      };
    } catch (error) {
      console.error(`Strategy execution failed for ${strategy.name}:`, error);

      // Log the error
      strategy.addExecutionLog({
        ruleId: "system",
        ruleName: "System Error",
        symbol: "ERROR",
        action: "HOLD",
        quantity: 0,
        price: 0,
        confidence: 0,
        reason: `Execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      await strategy.save();

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async evaluateRules(
    strategy: IStrategy,
    marketData?: Record<string, MarketData>
  ): Promise<StrategySignal | null> {
    const activeRules = strategy.activeRules;

    if (activeRules.length === 0) {
      return null;
    }

    for (const rule of activeRules) {
      // Check if rule can execute (cooldown)
      if (!strategy.canRuleExecute(rule.id)) {
        continue;
      }

      const ruleResult = await this.evaluateRule(rule, marketData);

      if (ruleResult && ruleResult.triggered) {
        // Rule triggered, return the signal
        return {
          action: rule.action.type,
          symbol: rule.condition.symbol,
          quantity: rule.action.quantity,
          confidence: 75, // Default confidence
          reason: `Rule "${rule.name || rule.id}" triggered: ${rule.condition.symbol} price ${this.getOperatorText(rule.condition.operator)} $${rule.condition.value}`,
          price: ruleResult.currentPrice,
        };
      }
    }

    return null; // No rules triggered
  }

  private async evaluateRule(
    rule: IRule,
    marketData?: Record<string, MarketData>
  ): Promise<{ triggered: boolean; currentPrice: number } | null> {
    try {
      // Get market data for the symbol
      const symbolData =
        marketData?.[rule.condition.symbol] ||
        (await this.fetchMarketDataForSymbol(rule.condition.symbol));

      if (!symbolData) {
        console.warn(`No market data available for ${rule.condition.symbol}`);
        return null;
      }

      // Evaluate the condition
      const conditionMet = this.evaluateCondition(rule.condition, symbolData);

      return {
        triggered: conditionMet,
        currentPrice: symbolData.price || symbolData.close || 0,
      };
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
      return null;
    }
  }

  private evaluateCondition(
    condition: ICondition,
    marketData: MarketData
  ): boolean {
    try {
      // Get the indicator value (for now, only price is supported in no-code builder)
      const indicatorValue = this.calculateIndicator(
        condition.indicator,
        marketData
      );

      // Apply operator comparison
      return this.applyOperator(
        indicatorValue,
        condition.operator,
        condition.value
      );
    } catch (error) {
      console.error(`Error evaluating condition:`, error);
      return false;
    }
  }

  private calculateIndicator(indicator: string, data: MarketData): number {
    switch (indicator.toLowerCase()) {
      case "price":
        return data.price || data.close || 0;
      case "volume":
        return data.volume || 0;
      // For now, only price is fully supported in the no-code builder
      // These are placeholders for future technical indicator implementations
      case "rsi":
        return this.calculateRSI(data);
      case "sma":
        return this.calculateSMA(data);
      case "ema":
        return this.calculateEMA(data);
      case "macd":
        return this.calculateMACD(data);
      case "bollinger":
        return this.calculateBollingerBands(data).upper;
      default:
        console.warn(`Unsupported indicator: ${indicator}`);
        return 0;
    }
  }

  private applyOperator(
    leftValue: number,
    operator: string,
    rightValue: number
  ): boolean {
    switch (operator) {
      case "greater_than":
        return leftValue > rightValue;
      case "less_than":
        return leftValue < rightValue;
      case "greater_equal":
        return leftValue >= rightValue;
      case "less_equal":
        return leftValue <= rightValue;
      case "equal_to":
        return Math.abs(leftValue - rightValue) < 0.001;
      case "crosses_above":
        // Simplified crossover logic - would need historical data for proper implementation
        return leftValue > rightValue;
      case "crosses_below":
        // Simplified crossover logic - would need historical data for proper implementation
        return leftValue < rightValue;
      default:
        console.warn(`Unsupported operator: ${operator}`);
        return false;
    }
  }

  private async executeTrades(
    strategy: IStrategy,
    signal: StrategySignal
  ): Promise<ITrade[]> {
    const trades: ITrade[] = [];

    try {
      // Get current market data for the symbol
      const marketData = await this.fetchMarketDataForSymbol(signal.symbol);
      const currentPrice = marketData?.price || signal.price || 0;

      if (currentPrice <= 0) {
        throw new Error(`Invalid price for ${signal.symbol}: ${currentPrice}`);
      }

      // Create trade document
      const tradeData = {
        userId: strategy.userId,
        symbol: signal.symbol,
        action: signal.action as "BUY" | "SELL",
        quantity: signal.quantity,
        triggerPrice: currentPrice,
        source: "strategy" as const,
        strategyId: strategy._id.toString(),
        marketData: {
          open: marketData?.open || currentPrice,
          high: marketData?.high || currentPrice,
          low: marketData?.low || currentPrice,
          close: currentPrice,
          volume: marketData?.volume || 0,
        },
        status: "executed" as const,
        executedAt: new Date(),
      };

      const trade = new Trade(tradeData);
      await trade.save();
      trades.push(trade);

      console.log(
        `Trade executed: ${signal.action} ${signal.quantity} ${signal.symbol} at $${currentPrice}`
      );

      return trades;
    } catch (error) {
      console.error(
        `Failed to execute trades for strategy ${strategy.name}:`,
        error
      );
      throw error;
    }
  }

  private async updateStrategyAfterExecution(
    strategy: IStrategy,
    signal: StrategySignal,
    trades: ITrade[]
  ): Promise<void> {
    try {
      // Find the rule that triggered
      const triggeredRule = strategy.rules.find(
        (rule) =>
          rule.condition.symbol === signal.symbol &&
          rule.action.type === signal.action
      );

      if (triggeredRule) {
        // Update rule's last executed time
        triggeredRule.lastExecuted = new Date();
      }

      // Add execution log
      strategy.addExecutionLog({
        ruleId: triggeredRule?.id || "unknown",
        ruleName: triggeredRule?.name || "Unknown Rule",
        symbol: signal.symbol,
        action: signal.action,
        quantity: signal.quantity,
        price: signal.price || 0,
        confidence: signal.confidence,
        reason: signal.reason,
        tradeId: trades[0]?._id?.toString(),
        status: "executed",
      });

      // Update last executed time for the strategy
      strategy.lastExecuted = new Date();

      // Save the strategy with updated logs and timestamps
      await strategy.save();

      console.log(`Strategy ${strategy.name} updated after execution`);
    } catch (error) {
      console.error(`Failed to update strategy after execution:`, error);
      // Don't throw here as the trade execution was successful
    }
  }

  private async fetchMarketDataForSymbol(
    symbol: string
  ): Promise<MarketData | null> {
    try {
      console.log(`Fetching real market data for ${symbol}`);

      // Use internal API to call market server
      const response = await internalApi.get(
        `${this.MARKET_SERVER_URL}/api/market/internal/quote/${symbol}`
      );

      if (response.data?.success && response.data?.data) {
        const quote = response.data.data;
        return {
          symbol: quote.symbol,
          price: quote.price,
          open: quote.dayLow, // Using available data
          high: quote.dayHigh,
          low: quote.dayLow,
          close: quote.price,
          volume: quote.volume,
          timestamp: quote.timestamp,
        };
      }

      console.warn(`No market data received for ${symbol}`);
      return null;
    } catch (error) {
      console.error(`Failed to fetch market data for ${symbol}:`, error);
      return null;
    }
  }

  private getOperatorText(operator: string): string {
    const operatorMap: Record<string, string> = {
      greater_than: ">",
      less_than: "<",
      greater_equal: ">=",
      less_equal: "<=",
      equal_to: "=",
      crosses_above: "crosses above",
      crosses_below: "crosses below",
    };
    return operatorMap[operator] || operator;
  }

  // Technical indicator calculations (placeholders for future implementation)
  // These would require historical data and proper calculation algorithms
  private calculateRSI(data: MarketData): number {
    // RSI calculation requires historical price data
    // This is a placeholder that returns neutral RSI
    console.warn("RSI calculation not implemented - returning neutral value");
    return 50;
  }

  private calculateSMA(data: MarketData): number {
    // SMA calculation requires historical price data
    // Using current price as fallback
    console.warn("SMA calculation not implemented - using current price");
    return data.close || data.price || 0;
  }

  private calculateEMA(data: MarketData): number {
    // EMA calculation requires historical price data
    // Using current price as fallback
    console.warn("EMA calculation not implemented - using current price");
    return data.close || data.price || 0;
  }

  private calculateMACD(data: MarketData): number {
    // MACD calculation requires historical price data
    console.warn("MACD calculation not implemented - returning zero");
    return 0;
  }

  private calculateBollingerBands(data: MarketData): {
    upper: number;
    lower: number;
  } {
    // Bollinger Bands calculation requires historical price data
    // Using simple percentage bands as fallback
    const price = data.close || data.price || 0;
    console.warn(
      "Bollinger Bands calculation not implemented - using simple percentage bands"
    );
    return {
      upper: price * 1.02,
      lower: price * 0.98,
    };
  }
}
