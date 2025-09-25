import mongoose from "mongoose";

export interface TradeValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ExecutionResult {
  execute: boolean;
  executionPrice: number | null;
  status: "pending" | "executed";
}

export interface ITrade extends Document {
  userId: mongoose.Types.ObjectId;
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  triggerPrice: number;
  fees: number;
  total: number;
  source: "market" | "limit" | "strategy" | "stop_loss" | "take_profit";
  limitPrice?: number;
  stopPrice?: number;
  status: "pending" | "executed" | "canceled";
  strategyId?: string;
  realizedPnL?: number;
  executedAt: Date;
  marketData: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  };
  calculateTotal(): number;
  calculateFees(amount: number): number;
}