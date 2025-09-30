import mongoose, { Document } from 'mongoose';

export interface IPosition {
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  totalInvested: number;
  lastUpdated: Date;
}

export interface IPortfolio extends Document {
  userId: mongoose.Types.ObjectId;
  cash: number;
  positions: IPosition[];
  totalEquity: number;
  realizedPnL: number;
  unrealizedPnL: number;
  dayChange: number;
  totalReturn: number;
  calculateTotalEquity(currentPrices: Record<string, number>): number;
  addPosition(symbol: string, quantity: number, price: number): void;
  removePosition(symbol: string, quantity: number): boolean;
}

const positionSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: [true, 'Symbol is required'],
    uppercase: true,
    validate: {
      validator: function (symbol: string) {
        // Basic symbol validation (3-12 chars, letters/numbers only)
        return /^[A-Z0-9]{3,12}$/.test(symbol);
      },
      message: 'Symbol must be 3-12 uppercase letters/numbers',
    },
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.00000001, 'Quantity must be positive'],
    validate: {
      validator: function (qty: number) {
        // Allow up to 8 decimal places
        return Number(qty.toFixed(8)) === qty;
      },
      message: 'Quantity cannot have more than 8 decimal places',
    },
  },
  avgBuyPrice: {
    type: Number,
    required: [true, 'Average buy price is required'],
    min: [0.00000001, 'Price must be positive'],
  },
  totalInvested: {
    type: Number,
    required: true,
    min: [0, 'Total invested cannot be negative'],
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

const portfolioSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
    },
    cash: {
      type: Number,
      required: [true, 'Cash balance is required'],
      min: [0, 'Cash cannot be negative'],
      max: [100000000, 'Cash cannot exceed $100M'],
      default: 100000,
    },
    positions: {
      type: [positionSchema],
      validate: {
        validator: function (positions: IPosition[]) {
          return positions.length <= 50;
        },
        message: 'Cannot hold more than 50 different positions',
      },
    },
    totalEquity: {
      type: Number,
      default: 100000,
      min: [0, 'Total equity cannot be negative'],
    },
    realizedPnL: {
      type: Number,
      default: 0,
    },
    unrealizedPnL: {
      type: Number,
      default: 0,
    },
    dayChange: {
      type: Number,
      default: 0,
    },
    totalReturn: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Calculate total equity method
portfolioSchema.methods.calculateTotalEquity = function (currentPrices: Record<string, number>): number {
  let positionValue = 0;
  
  for (const position of this.positions) {
    const currentPrice = currentPrices[position.symbol];
    if (currentPrice) {
      positionValue += position.quantity * currentPrice;
    }
  }
  
  return this.cash + positionValue;
};

// Add position method
portfolioSchema.methods.addPosition = function (symbol: string, quantity: number, price: number): void {
  const existingPosition = this.positions.find((p: IPosition) => p.symbol === symbol);
  
  if (existingPosition) {
    // Update existing position (weighted average)
    const totalQuantity = existingPosition.quantity + quantity;
    const totalValue = existingPosition.totalInvested + (quantity * price);
    existingPosition.avgBuyPrice = totalValue / totalQuantity;
    existingPosition.quantity = totalQuantity;
    existingPosition.totalInvested = totalValue;
    existingPosition.lastUpdated = new Date();
  } else {
    // Add new position
    this.positions.push({
      symbol: symbol.toUpperCase(),
      quantity,
      avgBuyPrice: price,
      totalInvested: quantity * price,
      lastUpdated: new Date(),
    });
  }
};

// Remove position method
portfolioSchema.methods.removePosition = function (symbol: string, quantity: number): boolean {
  const position = this.positions.find((p: IPosition) => p.symbol === symbol);
  
  if (!position || position.quantity < quantity) {
    return false; // Insufficient holdings
  }
  
  if (position.quantity === quantity) {
    // Remove entire position
    this.positions = this.positions.filter((p: IPosition) => p.symbol !== symbol);
  } else {
    // Reduce position
    const soldValue = (quantity / position.quantity) * position.totalInvested;
    position.quantity -= quantity;
    position.totalInvested -= soldValue;
    position.lastUpdated = new Date();
  }
  
  return true;
};

// Indexes
portfolioSchema.index({ userId: 1 }, { unique: true });
portfolioSchema.index({ 'positions.symbol': 1 });

export const Portfolio: mongoose.Model<IPortfolio> =
  (mongoose.models.Portfolio as mongoose.Model<IPortfolio>) ||
  mongoose.model<IPortfolio>('Portfolio', portfolioSchema);
