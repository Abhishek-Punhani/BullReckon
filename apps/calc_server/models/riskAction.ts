import mongoose, { Document, Schema } from "mongoose";

export interface IRiskAction extends Document {
  userId: mongoose.Types.ObjectId;
  action: "STOP_LOSS" | "TAKE_PROFIT" | "RISK_VIOLATION" | "TRADE_BLOCKED";
  symbol?: string;
  quantity?: number;
  price?: number;
  reason: string;
  violations?: string[];
  status: "pending" | "executed" | "failed";
  tradeId?: mongoose.Types.ObjectId;
  errorMessage?: string;
  executedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const riskActionSchema = new Schema<IRiskAction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["STOP_LOSS", "TAKE_PROFIT", "RISK_VIOLATION", "TRADE_BLOCKED"],
      required: true,
    },
    symbol: String,
    quantity: Number,
    price: Number,
    reason: {
      type: String,
      required: true,
    },
    violations: [String],
    status: {
      type: String,
      enum: ["pending", "executed", "failed"],
      default: "pending",
      index: true,
    },
    tradeId: {
      type: Schema.Types.ObjectId,
      ref: "Trade",
    },
    errorMessage: String,
    executedAt: Date,
  },
  { timestamps: true }
);

// Index for querying recent actions
riskActionSchema.index({ userId: 1, createdAt: -1 });
riskActionSchema.index({ userId: 1, symbol: 1, action: 1, createdAt: -1 });

export const RiskAction: mongoose.Model<IRiskAction> =
  (mongoose.models.RiskAction as mongoose.Model<IRiskAction>) ||
  mongoose.model<IRiskAction>("RiskAction", riskActionSchema);
