import mongoose, { Document } from "mongoose";

export interface IBacktestTrade {
  timestamp: Date;
  action: "BUY" | "SELL";
  symbol: string;
  quantity: number;
  price: number;
  pnl: number;
}

export interface IBacktest extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  strategyUrl: string;
  symbol: string;
  startDate: Date;
  endDate: Date;
  initialBalance: number;
  finalBalance: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  avgTradeReturn: number;
  trades: IBacktestTrade[];
  status: "pending" | "running" | "completed" | "failed";
  errorMessage?: string;
  completedAt?: Date;
  calculateMetrics(): void;
}

const backtestTradeSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: [true, "Trade timestamp is required"],
  },
  action: {
    type: String,
    required: [true, "Trade action is required"],
    enum: ["BUY", "SELL"],
  },
  symbol: {
    type: String,
    required: [true, "Symbol is required"],
    uppercase: true,
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [0.00000001, "Quantity must be positive"],
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0.00000001, "Price must be positive"],
  },
  pnl: {
    type: Number,
    default: 0,
  },
});

const backtestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    name: {
      type: String,
      required: [true, "Backtest name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    strategyUrl: {
      type: String,
      required: [true, "Strategy URL is required"],
      validate: {
        validator: function (url: string) {
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        },
        message: "Must provide a valid URL",
      },
    },
    symbol: {
      type: String,
      required: [true, "Symbol is required"],
      uppercase: true,
      validate: {
        validator: function (symbol: string) {
          return /^[A-Z0-9]{3,12}$/.test(symbol);
        },
        message: "Symbol must be 3-12 uppercase letters/numbers",
      },
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      validate: {
        validator: function (date: Date) {
          return date < new Date();
        },
        message: "Start date must be in the past",
      },
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
      validate: {
        validator: function (date: Date) {
          return date > (this as any).startDate && date <= new Date();
        },
        message: "End date must be after start date and not in the future",
      },
    },
    initialBalance: {
      type: Number,
      required: [true, "Initial balance is required"],
      min: [1000, "Initial balance must be at least $1,000"],
      max: [10000000, "Initial balance cannot exceed $10M"],
      default: 100000,
    },
    finalBalance: {
      type: Number,
      min: [0, "Final balance cannot be negative"],
    },
    totalReturn: {
      type: Number,
      validate: {
        validator: function (returnPct: number) {
          if (returnPct === undefined) return true;
          return returnPct >= -100; // Can't lose more than 100%
        },
        message: "Total return cannot be less than -100%",
      },
    },
    maxDrawdown: {
      type: Number,
      min: [0, "Max drawdown cannot be negative"],
      max: [100, "Max drawdown cannot exceed 100%"],
    },
    sharpeRatio: Number,
    winRate: {
      type: Number,
      min: [0, "Win rate cannot be negative"],
      max: [100, "Win rate cannot exceed 100%"],
    },
    totalTrades: {
      type: Number,
      min: [0, "Total trades cannot be negative"],
      default: 0,
    },
    avgTradeReturn: Number,
    trades: [backtestTradeSchema],
    status: {
      type: String,
      enum: {
        values: ["pending", "running", "completed", "failed"],
        message: "Invalid status",
      },
      default: "pending",
    },
    errorMessage: {
      type: String,
      maxlength: [500, "Error message cannot exceed 500 characters"],
    },
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Calculate performance metrics
backtestSchema.methods.calculateMetrics = function (): void {
  if (this.trades.length === 0) return;

  // Total return
  this.totalReturn =
    ((this.finalBalance - this.initialBalance) / this.initialBalance) * 100;

  // Win rate
  const profitableTrades = this.trades.filter((t: IBacktestTrade) => t.pnl > 0);
  this.winRate = (profitableTrades.length / this.trades.length) * 100;

  // Average trade return
  const totalPnL = this.trades.reduce(
    (sum: number, t: IBacktestTrade) => sum + t.pnl,
    0
  );
  this.avgTradeReturn = totalPnL / this.trades.length;

  // Max drawdown calculation (simplified)
  let peak = this.initialBalance;
  let maxDD = 0;
  let currentBalance = this.initialBalance;

  for (const trade of this.trades) {
    currentBalance += trade.pnl;
    if (currentBalance > peak) {
      peak = currentBalance;
    }
    const drawdown = ((peak - currentBalance) / peak) * 100;
    if (drawdown > maxDD) {
      maxDD = drawdown;
    }
  }

  this.maxDrawdown = maxDD;
};

// Pre-save middleware
backtestSchema.pre("save", function (next) {
  if (this.status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
    (this as any as IBacktest).calculateMetrics();
  }
  next();
});

// Indexes
backtestSchema.index({ userId: 1, createdAt: -1 });
backtestSchema.index({ status: 1 });
backtestSchema.index({ symbol: 1, startDate: 1, endDate: 1 });

export const Backtest: mongoose.Model<IBacktest> =
  (mongoose.models.Backtest as mongoose.Model<IBacktest>) ||
  mongoose.model<IBacktest>("Backtest", backtestSchema);
