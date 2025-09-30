import { Request } from "express";
import { TradeValidationResult } from "../types";

export const validateTradeInput = (req: Request): TradeValidationResult => {
  const { symbol, action, quantity, source, limitPrice, stopPrice } = req.body;

  const errors: string[] = [];

  if (!symbol) errors.push("Symbol is required");
  if (!["BUY", "SELL"].includes(action))
    errors.push("Action must be BUY or SELL");
  if (!quantity || quantity <= 0)
    errors.push("Quantity must be a positive number");
  if (!["market", "limit", "stop_loss", "take_profit"].includes(source))
    errors.push("Invalid order source");

  if (source === "limit" && !limitPrice)
    errors.push("Limit price is required for limit orders");
  if ((source === "stop_loss" || source === "take_profit") && !stopPrice)
    errors.push("Stop price is required for stop/take profit orders");

  return {
    valid: errors.length === 0,
    errors,
  };
};
