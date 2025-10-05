import { Strategy } from "../models/strategy";
import { MarketService } from "../../market_server/services/marketService";
import { TradeService } from "./tradeService";

export interface ExecutionResult {
  success: boolean;
  action?: "BUY" | "SELL" | "HOLD";
  signal?: any;
  error?: string;
  executedTrades?: any[];
}

export class StrategyExecutionService {
  private marketService: MarketService;
  private tradeService: TradeService;

  constructor() {
    this.marketService = new MarketService();
    this.tradeService = new TradeService();
  }

  async executeStrategy(
    strategy: Strategy,
    marketData?: any
  ): Promise<ExecutionResult> {
    try {
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

      // Update strategy metrics
      await this.updateStrategyMetrics(strategy._id, signal, executedTrades);

      return {
        success: true,
        action: signal.action,
        signal,
        executedTrades,
      };
    } catch (error) {
      console.error(`Strategy execution failed for ${strategy.name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async evaluateRules(
    strategy: Strategy,
    marketData?: any
  ): Promise<any> {
    const results: any[] = [];

    for (const rule of strategy.rules) {
      const ruleResult = await this.evaluateRule(rule, marketData);
      results.push(ruleResult);
    }

    // Combine rule results based on strategy logic
    const combinedResult = this.combineRuleResults(results, strategy.rules);

    return combinedResult;
  }

  private async evaluateRule(rule: any, marketData?: any): Promise<any> {
    // If no market data provided, fetch it
    if (!marketData) {
      marketData = await this.fetchMarketDataForRule(rule);
    }

    // Evaluate conditions
    for (const condition of rule.conditions) {
      const conditionMet = this.evaluateCondition(condition, marketData);
      if (!conditionMet) {
        return null; // Rule not triggered
      }
    }

    // If all conditions met, return action
    return rule.action;
  }

  private evaluateCondition(condition: any, marketData: any): boolean {
    const { indicator, operator, value, timeframe } = condition;

    // Get the relevant market data based on timeframe
    const relevantData = this.getDataForTimeframe(marketData, timeframe);

    // Calculate indicator value
    const indicatorValue = this.calculateIndicator(indicator, relevantData);

    // Apply operator comparison
    return this.applyOperator(indicatorValue, operator, value);
  }

  private getDataForTimeframe(marketData: any, timeframe: string): any {
    // Extract data for specific timeframe (1m, 5m, 1h, 1d, etc.)
    return marketData[timeframe] || marketData;
  }

  private calculateIndicator(indicator: string, data: any): number {
    switch (indicator.toLowerCase()) {
      case "price":
        return data.close || data.price;
      case "volume":
        return data.volume;
      case "rsi":
        return this.calculateRSI(data);
      case "sma":
        return this.calculateSMA(data);
      case "ema":
        return this.calculateEMA(data);
      case "macd":
        return this.calculateMACD(data);
      case "bb_upper":
        return this.calculateBollingerBands(data).upper;
      case "bb_lower":
        return this.calculateBollingerBands(data).lower;
      default:
        return 0;
    }
  }

  private applyOperator(
    leftValue: number,
    operator: string,
    rightValue: number
  ): boolean {
    switch (operator) {
      case ">":
        return leftValue > rightValue;
      case "<":
        return leftValue < rightValue;
      case ">=":
        return leftValue >= rightValue;
      case "<=":
        return leftValue <= rightValue;
      case "==":
        return Math.abs(leftValue - rightValue) < 0.001;
      case "!=":
        return Math.abs(leftValue - rightValue) >= 0.001;
      case "crosses_above":
        // Implementation for crossover logic
        return this.checkCrossover(leftValue, rightValue, "above");
      case "crosses_below":
        return this.checkCrossover(leftValue, rightValue, "below");
      default:
        return false;
    }
  }

  private combineRuleResults(results: any[], rules: any[]): any {
    // Filter out null results (rules not triggered)
    const validResults = results.filter((r) => r !== null);

    if (validResults.length === 0) {
      return { action: "HOLD" };
    }

    // For now, use the first valid result
    // In a more complex system, you'd have logic combination rules
    return validResults[0];
  }

  private async executeTrades(strategy: Strategy, signal: any): Promise<any[]> {
    const trades = [];

    // Create trade based on signal
    const trade = {
      strategy_id: strategy._id,
      symbol: signal.symbol || strategy.tradingPair,
      side: signal.action.toLowerCase(),
      quantity: signal.quantity || strategy.positionSize,
      type: "market",
      confidence: signal.confidence || 50,
      reason: signal.reason || "Strategy signal",
    };

    // Execute the trade through trade service
    const executedTrade = await this.tradeService.createTrade(trade);
    trades.push(executedTrade);

    return trades;
  }

  private async updateStrategyMetrics(
    strategyId: string,
    signal: any,
    trades: any[]
  ): Promise<void> {
    // Update strategy performance metrics
    // This would involve calculating P&L, win rate, etc.
    console.log(`Updating metrics for strategy ${strategyId}`);
  }

  private async fetchMarketDataForRule(rule: any): Promise<any> {
    // Fetch market data needed for rule evaluation
    // This is a simplified version - real implementation would be more sophisticated
    return {};
  }

  // Technical indicator calculations (simplified versions)
  private calculateRSI(data: any): number {
    // Simplified RSI calculation
    return 50; // Placeholder
  }

  private calculateSMA(data: any): number {
    // Simplified SMA calculation
    return data.close || 0;
  }

  private calculateEMA(data: any): number {
    // Simplified EMA calculation
    return data.close || 0;
  }

  private calculateMACD(data: any): number {
    // Simplified MACD calculation
    return 0;
  }

  private calculateBollingerBands(data: any): { upper: number; lower: number } {
    // Simplified Bollinger Bands calculation
    const price = data.close || 0;
    return {
      upper: price * 1.02,
      lower: price * 0.98,
    };
  }

  private checkCrossover(
    current: number,
    target: number,
    direction: "above" | "below"
  ): boolean {
    // Simplified crossover detection
    // In real implementation, you'd need historical data to detect actual crossovers
    return direction === "above" ? current > target : current < target;
  }
}

// Simple trade service for strategy execution
class TradeService {
  async createTrade(tradeData: any): Promise<any> {
    // This would integrate with the actual trade creation system
    console.log("Creating trade:", tradeData);
    return {
      id: Date.now().toString(),
      ...tradeData,
      status: "executed",
      timestamp: new Date(),
    };
  }
}
