import mongoose, { Document } from "mongoose";

// Strategy condition types
export interface ICondition {
  indicator: string;
  operator: string;
  value: number;
  symbol: string;
  timeframe?: string;
  secondValue?: number; // For conditions requiring two values
}

// Strategy action types
export interface IAction {
  type: "BUY" | "SELL" | "HOLD";
  quantity: number;
  quantityType: "percentage" | "fixed";
  symbol?: string; // If different from condition symbol
  priceType?: "market" | "limit";
  limitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

// Strategy rule
export interface IRule {
  id: string;
  name?: string;
  condition: ICondition;
  action: IAction;
  isActive: boolean;
  priority: number;
  cooldownMinutes?: number; // Prevent repeated execution
  lastExecuted?: Date;
}

// Strategy configuration
export interface IStrategyConfig {
  riskPerTrade: number; // Percentage
  stopLoss: number; // Percentage
  takeProfit: number; // Percentage
  maxPositions: number;
  cooldownBetweenTrades: number; // Minutes
  enableRiskManagement: boolean;
  portfolioAllocation: number; // Max percentage of portfolio to use
}

// Strategy performance metrics
export interface IStrategyMetrics {
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

// Execution log entry
export interface IExecutionLog {
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

// Main strategy interface
export interface IStrategy extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  type: "no-code" | "code" | "ml";
  status: "active" | "inactive" | "paused" | "error";
  rules: IRule[];
  config: IStrategyConfig;
  metrics: IStrategyMetrics;
  currentPerformance: {
    netProfit: number;
    roi: number;
    winRate: number;
    profitFactor: number;
    totalTrades: number;
  };
  executionLogs: IExecutionLog[];
  isBacktested: boolean;
  backtestResults?: any;
  createdAt: Date;
  updatedAt: Date;
  lastExecuted?: Date;
  version: number;

  // Virtual properties
  activeRules: IRule[];

  // Methods
  addExecutionLog(log: Omit<IExecutionLog, "timestamp">): IExecutionLog;
  updateMetrics(tradeResult: { profit: number; isWin: boolean }): void;
  canRuleExecute(ruleId: string): boolean;
}

// Mongoose schemas
const conditionSchema = new mongoose.Schema({
  indicator: {
    type: String,
    required: true,
    enum: [
      "rsi",
      "ema",
      "sma",
      "macd",
      "bollinger",
      "volume",
      "price",
      "stochastic",
    ],
  },
  operator: {
    type: String,
    required: true,
    enum: [
      "greater_than",
      "less_than",
      "equal_to",
      "greater_equal",
      "less_equal",
      "crosses_above",
      "crosses_below",
    ],
  },
  value: {
    type: Number,
    required: true,
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
  },
  timeframe: {
    type: String,
    enum: ["1m", "5m", "15m", "30m", "1h", "4h", "1d"],
    default: "1h",
  },
  secondValue: {
    type: Number,
  },
});

const actionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["BUY", "SELL", "HOLD"],
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.00000001,
  },
  quantityType: {
    type: String,
    required: true,
    enum: ["percentage", "fixed"],
  },
  symbol: {
    type: String,
    uppercase: true,
  },
  priceType: {
    type: String,
    enum: ["market", "limit"],
    default: "market",
  },
  limitPrice: {
    type: Number,
    min: 0,
  },
  stopLoss: {
    type: Number,
    min: 0,
  },
  takeProfit: {
    type: Number,
    min: 0,
  },
});

const ruleSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: "",
  },
  condition: {
    type: conditionSchema,
    required: true,
  },
  action: {
    type: actionSchema,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10,
  },
  cooldownMinutes: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastExecuted: {
    type: Date,
  },
});

const configSchema = new mongoose.Schema({
  riskPerTrade: {
    type: Number,
    required: true,
    min: 0.1,
    max: 100,
    default: 5,
  },
  stopLoss: {
    type: Number,
    required: true,
    min: 0.1,
    max: 50,
    default: 5,
  },
  takeProfit: {
    type: Number,
    required: true,
    min: 0.1,
    max: 100,
    default: 10,
  },
  maxPositions: {
    type: Number,
    required: true,
    min: 1,
    max: 20,
    default: 5,
  },
  cooldownBetweenTrades: {
    type: Number,
    required: true,
    min: 0,
    default: 60,
  },
  enableRiskManagement: {
    type: Boolean,
    default: true,
  },
  portfolioAllocation: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
    default: 50,
  },
});

const metricsSchema = new mongoose.Schema({
  totalTrades: {
    type: Number,
    default: 0,
    min: 0,
  },
  winningTrades: {
    type: Number,
    default: 0,
    min: 0,
  },
  losingTrades: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalProfit: {
    type: Number,
    default: 0,
  },
  totalLoss: {
    type: Number,
    default: 0,
  },
  winRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  profitFactor: {
    type: Number,
    default: 0,
    min: 0,
  },
  maxDrawdown: {
    type: Number,
    default: 0,
    min: 0,
  },
  sharpeRatio: {
    type: Number,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

const executionLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  ruleId: {
    type: String,
    required: true,
  },
  ruleName: {
    type: String,
    default: "",
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
  },
  action: {
    type: String,
    required: true,
    enum: ["BUY", "SELL", "HOLD"],
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 50,
  },
  reason: {
    type: String,
    required: true,
  },
  tradeId: {
    type: String,
  },
  status: {
    type: String,
    required: true,
    enum: ["pending", "executed", "failed", "cancelled"],
    default: "pending",
  },
  errorMessage: {
    type: String,
  },
  profit: {
    type: Number,
  },
});

const strategySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      required: true,
      enum: ["no-code", "code", "ml"],
      default: "no-code",
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "inactive", "paused", "error"],
      default: "inactive",
    },
    rules: {
      type: [ruleSchema],
      validate: {
        validator: function (rules: IRule[]) {
          return rules.length > 0 && rules.length <= 20;
        },
        message: "Strategy must have between 1 and 20 rules",
      },
    },
    config: {
      type: configSchema,
      required: true,
    },
    metrics: {
      type: metricsSchema,
      default: () => ({}),
    },
    executionLogs: {
      type: [executionLogSchema],
      validate: {
        validator: function (logs: IExecutionLog[]) {
          return logs.length <= 1000; // Keep last 1000 executions
        },
        message: "Execution logs cannot exceed 1000 entries",
      },
    },
    isBacktested: {
      type: Boolean,
      default: false,
    },
    backtestResults: {
      type: mongoose.Schema.Types.Mixed,
    },
    lastExecuted: {
      type: Date,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for getting active rules
strategySchema.virtual("activeRules").get(function () {
  return this.rules.filter((rule: any) => rule.isActive);
});

// Method to add execution log
strategySchema.methods.addExecutionLog = function (
  log: Omit<IExecutionLog, "timestamp">
) {
  const newLog = {
    ...log,
    timestamp: new Date(),
  };

  this.executionLogs.push(newLog);

  // Keep only last 1000 logs
  if (this.executionLogs.length > 1000) {
    this.executionLogs = this.executionLogs.slice(-1000);
  }

  return newLog;
};

// Method to update metrics
strategySchema.methods.updateMetrics = function (tradeResult: {
  profit: number;
  isWin: boolean;
}) {
  const metrics = this.metrics;

  metrics.totalTrades += 1;

  if (tradeResult.isWin) {
    metrics.winningTrades += 1;
    metrics.totalProfit += tradeResult.profit;
  } else {
    metrics.losingTrades += 1;
    metrics.totalLoss += Math.abs(tradeResult.profit);
  }

  // Calculate win rate
  metrics.winRate =
    metrics.totalTrades > 0
      ? (metrics.winningTrades / metrics.totalTrades) * 100
      : 0;

  // Calculate profit factor
  metrics.profitFactor =
    Math.abs(metrics.totalLoss) > 0
      ? metrics.totalProfit / Math.abs(metrics.totalLoss)
      : metrics.totalProfit > 0
        ? Infinity
        : 0;

  metrics.lastUpdated = new Date();
};

// Method to check if rule can execute (cooldown check)
strategySchema.methods.canRuleExecute = function (ruleId: string): boolean {
  const rule = this.rules.find((r: IRule) => r.id === ruleId);
  if (!rule || !rule.isActive) return false;

  if (rule.cooldownMinutes && rule.lastExecuted) {
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    const timeSinceLastExecution = Date.now() - rule.lastExecuted.getTime();
    return timeSinceLastExecution >= cooldownMs;
  }

  return true;
};

// Index for efficient queries
strategySchema.index({ userId: 1, status: 1 });
strategySchema.index({ userId: 1, type: 1 });
strategySchema.index({ status: 1, lastExecuted: 1 });
strategySchema.index({ "rules.condition.symbol": 1 });

export const Strategy: mongoose.Model<IStrategy> =
  (mongoose.models.Strategy as mongoose.Model<IStrategy>) ||
  mongoose.model<IStrategy>("Strategy", strategySchema);
