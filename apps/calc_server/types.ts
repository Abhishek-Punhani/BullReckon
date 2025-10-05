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


