import { ExecutionResult } from "../types";

/**
 * Executes order based on type and market conditions
 *
 * Order Types:
 * 1. MARKET: Executes immediately at current price
 * 2. LIMIT: Executes only when price reaches desired level
 *    - Buy Limit: Executes when price <= limitPrice (buy at or below)
 *    - Sell Limit: Executes when price >= limitPrice (sell at or above)
 * 3. STOP (stop_loss): Trigger order that converts to market order
 *    - Buy Stop: Executes when price >= stopPrice (breakout buy)
 *    - Sell Stop: Executes when price <= stopPrice (stop loss sell)
 * 4. TAKE_PROFIT: Executes when profit target is reached
 *    - Sell Take Profit: Executes when price >= stopPrice
 */
export const executeOrder = ({
  source,
  action,
  currentPrice,
  limitPrice,
  stopPrice,
}: {
  source: "market" | "limit" | "stop_loss" | "take_profit";
  action: "BUY" | "SELL";
  currentPrice: number;
  limitPrice?: number;
  stopPrice?: number;
}): ExecutionResult => {
  switch (source) {
    case "market":
      // Market orders execute immediately at current price
      return {
        execute: true,
        executionPrice: currentPrice,
        status: "executed",
      };

    case "limit":
      // Limit Buy: Execute if current price <= limit price (buy at or below)
      if (action === "BUY" && currentPrice <= (limitPrice ?? 0)) {
        return {
          execute: true,
          executionPrice: limitPrice ?? currentPrice,
          status: "executed",
        };
      }
      // Limit Sell: Execute if current price >= limit price (sell at or above)
      if (action === "SELL" && currentPrice >= (limitPrice ?? Infinity)) {
        return {
          execute: true,
          executionPrice: limitPrice ?? currentPrice,
          status: "executed",
        };
      }
      return { execute: false, executionPrice: null, status: "pending" };

    case "stop_loss":
      // Stop Loss Buy: Execute if price >= stop price (breakout buy)
      if (action === "BUY" && currentPrice >= (stopPrice ?? Infinity)) {
        return {
          execute: true,
          executionPrice: currentPrice, // executed at market when triggered
          status: "executed",
        };
      }
      // Stop Loss Sell: Execute if price <= stop price (stop loss sell)
      if (action === "SELL" && currentPrice <= (stopPrice ?? Infinity)) {
        return {
          execute: true,
          executionPrice: currentPrice, // executed at market when triggered
          status: "executed",
        };
      }
      return { execute: false, executionPrice: null, status: "pending" };

    case "take_profit":
      // Take Profit Sell: Execute if price >= stop price (profit target reached)
      if (action === "SELL" && currentPrice >= (stopPrice ?? 0)) {
        return {
          execute: true,
          executionPrice: currentPrice, // executed at market when triggered
          status: "executed",
        };
      }
      return { execute: false, executionPrice: null, status: "pending" };

    default:
      return { execute: false, executionPrice: null, status: "pending" };
  }
};
