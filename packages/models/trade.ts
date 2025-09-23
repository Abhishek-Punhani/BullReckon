import mongoose, { Document } from 'mongoose';

export interface ITrade extends Document {
  userId: mongoose.Types.ObjectId;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  fees: number;
  total: number;
  source: 'manual' | 'strategy' | 'stop_loss' | 'take_profit';
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

const tradeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    symbol: {
      type: String,
      required: [true, 'Symbol is required'],
      uppercase: true,
      validate: {
        validator: function (symbol: string) {
          return /^[A-Z0-9]{3,12}$/.test(symbol);
        },
        message: 'Symbol must be 3-12 uppercase letters/numbers',
      },
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: {
        values: ['BUY', 'SELL'],
        message: 'Action must be either BUY or SELL',
      },
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.00000001, 'Quantity must be positive'],
      validate: {
        validator: function (qty: number) {
          return Number(qty.toFixed(8)) === qty;
        },
        message: 'Quantity cannot have more than 8 decimal places',
      },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0.00000001, 'Price must be positive'],
    },
    fees: {
      type: Number,
      default: 0,
      min: [0, 'Fees cannot be negative'],
      validate: {
        validator: function (fees: number) {
          const tradeValue = this.quantity * this.price;
          return fees <= tradeValue * 0.1; // Max 10% fees
        },
        message: 'Fees cannot exceed 10% of trade value',
      },
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative'],
    },
    source: {
      type: String,
      required: [true, 'Source is required'],
      enum: {
        values: ['manual', 'strategy', 'stop_loss', 'take_profit'],
        message: 'Invalid trade source',
      },
      default: 'manual',
    },
    strategyId: {
      type: String,
      validate: {
        validator: function (strategyId: string) {
          if (!strategyId) return true;
          return strategyId.length <= 100;
        },
        message: 'Strategy ID cannot exceed 100 characters',
      },
    },
    realizedPnL: {
      type: Number,
      validate: {
        validator: function (pnl: number) {
          if (pnl === undefined || pnl === null) return true;
          return this.action === 'SELL'; // Only SELL trades can have realized PnL
        },
        message: 'Only SELL trades can have realized PnL',
      },
    },
    executedAt: {
      type: Date,
      default: Date.now,
      validate: {
        validator: function (date: Date) {
          return date <= new Date();
        },
        message: 'Execution date cannot be in the future',
      },
    },
    marketData: {
      open: {
        type: Number,
        required: [true, 'Market open price is required'],
        min: [0, 'Open price must be positive'],
      },
      high: {
        type: Number,
        required: [true, 'Market high price is required'],
        min: [0, 'High price must be positive'],
      },
      low: {
        type: Number,
        required: [true, 'Market low price is required'],
        min: [0, 'Low price must be positive'],
      },
      close: {
        type: Number,
        required: [true, 'Market close price is required'],
        min: [0, 'Close price must be positive'],
      },
      volume: {
        type: Number,
        required: [true, 'Market volume is required'],
        min: [0, 'Volume cannot be negative'],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Calculate total trade value
tradeSchema.methods.calculateTotal = function (): number {
  return (this.quantity * this.price) + this.fees;
};

// Calculate fees (0.1% default)
tradeSchema.methods.calculateFees = function (amount: number): number {
  return amount * 0.001; // 0.1% fee
};

// Pre-save middleware to calculate total and fees
tradeSchema.pre('save', function (next) {
  if (!this.fees) {
    this.fees = (this as unknown as ITrade).calculateFees(this.quantity * this.price);
  }
  this.total = (this as unknown as ITrade).calculateTotal();
  
  // Validate market data consistency
  if (this.marketData.high < this.marketData.low) {
    return next(new Error('High price cannot be less than low price'));
  }
  if (this.marketData.open < 0 || this.marketData.close < 0) {
    return next(new Error('Open and close prices must be positive'));
  }
  
  next();
});

// Indexes
tradeSchema.index({ userId: 1, executedAt: -1 });
tradeSchema.index({ symbol: 1, executedAt: -1 });
tradeSchema.index({ source: 1 });

export const Trade = mongoose.models.Trade || mongoose.model<ITrade>('Trade', tradeSchema);