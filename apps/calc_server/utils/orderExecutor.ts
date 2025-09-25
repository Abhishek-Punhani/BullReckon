import { ExecutionResult } from "../types";

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
      return { execute: true, executionPrice: currentPrice, status: "executed" };

    case "limit":
      if (
        (action === "BUY" && currentPrice <= (limitPrice ?? 0)) ||
        (action === "SELL" && currentPrice >= (limitPrice ?? Infinity))
      ) {
        return {
          execute: true,
          executionPrice: limitPrice ?? currentPrice,
          status: "executed",
        };
      }
      return { execute: false, executionPrice: null, status: "pending" };

    case "stop_loss":
      if (action === "SELL" && currentPrice <= (stopPrice ?? Infinity)) {
        return {
          execute: true,
          executionPrice: currentPrice, // executed at market when triggered
          status: "executed",
        };
      }
      return { execute: false, executionPrice: null, status: "pending" };

    case "take_profit":
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

