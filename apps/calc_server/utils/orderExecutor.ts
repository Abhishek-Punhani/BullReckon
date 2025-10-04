import { ExecutionResult } from "../types";

/**
 * Executes order based on type and market conditions
 *
 * Order Types:
 * 1. MARKET: Executes immediately at current price
 * 2. LIMIT: Always queued as pending, worker monitors continuously
 *    - Buy Limit: Executes when price <= limitPrice (buy at or below)
 *    - Sell Limit: Executes when price >= limitPrice (sell at or above)
 * 3. STOP (stop_loss): Always queued as pending, worker monitors continuously
 *    - Buy Stop: Executes when price >= stopPrice (breakout buy)
 *    - Sell Stop: Executes when price <= stopPrice (stop loss sell)
 * 4. TAKE_PROFIT: Always queued as pending, worker monitors continuously
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
    case "stop_loss":
    case "take_profit":
      // ALL limit, stop loss, and take profit orders are ALWAYS queued as pending
      // The pending order worker will continuously monitor and execute when conditions are met
      // This ensures orders don't execute immediately even if conditions are currently met
      return {
        execute: false,
        executionPrice: null,
        status: "pending",
      };

    default:
      return { execute: false, executionPrice: null, status: "pending" };
  }
};
