import mongoose, { Document, Schema } from "mongoose";

export interface BacktestSummary {
  symbol: string;
  period: {
    start: string;
    end: string;
  };
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  profit_factor: number;
  pnl: {
    gross_profit: number;
    gross_loss: number;
    net_profit: number;
    percentage_return: number;
    max_drawdown: number;
  };
  risk_metrics: {
    sharpe_ratio: number;
    sortino_ratio: number;
    alpha: number;
    beta: number;
    volatility: number;
    confidence_level: number;
  };
}

export interface BacktestResult {
  summary: BacktestSummary;
  equity_curve: Array<{ date: string; equity: number }>;
  trade_log: Array<{
    trade_id: number;
    entry_date: string;
    exit_date: string;
    entry_price: number;
    exit_price: number;
    position: string;
    size: number;
    pnl: number;
  }>;
}

export interface IBacktest extends Document {
  userId: mongoose.Types.ObjectId;
  backtest_id: string;
  status: string;
  results: BacktestResult;
  createdAt: Date;
}

const BacktestSchema = new Schema<IBacktest>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  backtest_id: { type: String, required: true, unique: true },
  status: { type: String, default: "completed" },
  results: {
    summary: {
      symbol: String,
      period: {
        start: String,
        end: String,
      },
      total_trades: Number,
      winning_trades: Number,
      losing_trades: Number,
      win_rate: Number,
      profit_factor: Number,
      pnl: {
        gross_profit: Number,
        gross_loss: Number,
        net_profit: Number,
        percentage_return: Number,
        max_drawdown: Number,
      },
      risk_metrics: {
        sharpe_ratio: Number,
        sortino_ratio: Number,
        alpha: Number,
        beta: Number,
        volatility: Number,
        confidence_level: Number,
      },
    },
    equity_curve: [
      {
        date: String,
        equity: Number,
      },
    ],
    trade_log: [
      {
        trade_id: Number,
        entry_date: String,
        exit_date: String,
        entry_price: Number,
        exit_price: Number,
        position: String,
        size: Number,
        pnl: Number,
      },
    ],
  },
  createdAt: { type: Date, default: Date.now },
});

export const Backtest: mongoose.Model<IBacktest> =
    (mongoose.models.Backtest as mongoose.Model<IBacktest>) ||
    mongoose.model<IBacktest>("Backtest", BacktestSchema);
