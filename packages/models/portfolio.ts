import mongoose, { Document } from "mongoose";

export interface IPosition {
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  totalInvested: number;
  lastUpdated: Date;
}

export interface IPositionWithMarketData extends IPosition {
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercentage: number;
}

export interface IPortfolioSnapshot {
  userId: string;
  cash: number;
  totalEquity: number;
  realizedPnL: number;
  unrealizedPnL: number;
  dayChange: number;
  totalReturn: number;
  positions: IPositionWithMarketData[];
  totalInvested: number;
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
  refreshMarketValues(prices: Record<string, number>): Promise<void>;
  toSnapshotDTO(prices: Record<string, number>): IPortfolioSnapshot;
}

const positionSchema = new mongoose.Schema({
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
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [0.00000001, "Quantity must be positive"],
    validate: {
      validator: function (qty: number) {
        return Number(qty.toFixed(8)) === qty;
      },
      message: "Quantity cannot have more than 8 decimal places",
    },
  },
  avgBuyPrice: {
    type: Number,
    required: [true, "Average buy price is required"],
    min: [0.00000001, "Price must be positive"],
  },
  totalInvested: {
    type: Number,
    required: true,
    min: [0, "Total invested cannot be negative"],
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
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
    },
    cash: {
      type: Number,
      required: [true, "Cash balance is required"],
      min: [0, "Cash cannot be negative"],
      max: [100000000, "Cash cannot exceed $100M"],
      default: 100000,
    },
    positions: {
      type: [positionSchema],
      validate: {
        validator: function (positions: IPosition[]) {
          return positions.length <= 50;
        },
        message: "Cannot hold more than 50 different positions",
      },
    },
    totalEquity: {
      type: Number,
      default: 100000,
      min: [0, "Total equity cannot be negative"],
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
portfolioSchema.methods.calculateTotalEquity = function (
  currentPrices: Record<string, number>
): number {
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
portfolioSchema.methods.addPosition = function (
  symbol: string,
  quantity: number,
  price: number
): void {
  const existingPosition = this.positions.find(
    (p: IPosition) => p.symbol === symbol
  );

  if (existingPosition) {
    // Update existing position (weighted average)
    const totalQuantity = existingPosition.quantity + quantity;
    const totalValue = existingPosition.totalInvested + quantity * price;
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
portfolioSchema.methods.removePosition = function (
  symbol: string,
  quantity: number
): boolean {
  const position = this.positions.find((p: IPosition) => p.symbol === symbol);

  if (!position || position.quantity < quantity) {
    return false; // Insufficient holdings
  }

  if (position.quantity === quantity) {
    // Remove entire position
    this.positions = this.positions.filter(
      (p: IPosition) => p.symbol !== symbol
    );
  } else {
    // Reduce position
    const soldValue = (quantity / position.quantity) * position.totalInvested;
    position.quantity -= quantity;
    position.totalInvested -= soldValue;
    position.lastUpdated = new Date();
  }

  return true;
};

// Refresh market values method
portfolioSchema.methods.refreshMarketValues = async function (
  prices: Record<string, number>
): Promise<void> {
  let totalPositionValue = 0;
  let totalUnrealizedPnL = 0;

  for (const position of this.positions) {
    const currentPrice = prices[position.symbol] ?? position.avgBuyPrice;
    const currentValue = position.quantity * currentPrice;
    const unrealizedPnL = currentValue - position.totalInvested;

    totalPositionValue += currentValue;
    totalUnrealizedPnL += unrealizedPnL;
  }

  this.unrealizedPnL = totalUnrealizedPnL;
  this.totalEquity = this.cash + totalPositionValue;
  this.totalReturn = ((this.totalEquity - 100000) / 100000) * 100;
};

// Create snapshot DTO with market data - FIXED VERSION
portfolioSchema.methods.toSnapshotDTO = function (
  prices: Record<string, number>
): IPortfolioSnapshot {
  const decoratedPositions: IPositionWithMarketData[] = this.positions.map(
    (position: any) => {
      // Extract clean position data from Mongoose document
      const cleanPosition = {
        symbol: position.symbol || position._doc?.symbol,
        quantity: position.quantity || position._doc?.quantity,
        avgBuyPrice: position.avgBuyPrice || position._doc?.avgBuyPrice,
        totalInvested: position.totalInvested || position._doc?.totalInvested,
        lastUpdated: position.lastUpdated || position._doc?.lastUpdated,
      };

      const currentPrice =
        prices[cleanPosition.symbol] ?? cleanPosition.avgBuyPrice;
      const currentValue = cleanPosition.quantity * currentPrice;
      const unrealizedPnL = currentValue - cleanPosition.totalInvested;
      const unrealizedPnLPercentage =
        cleanPosition.totalInvested > 0
          ? (unrealizedPnL / cleanPosition.totalInvested) * 100
          : 0;

      return {
        ...cleanPosition,
        currentPrice,
        currentValue,
        unrealizedPnL,
        unrealizedPnLPercentage,
      };
    }
  );

  const totalInvested = decoratedPositions.reduce(
    (sum: number, position: IPositionWithMarketData) =>
      sum + position.totalInvested,
    0
  );

  return {
    userId: this.userId?.toString() || this.userId,
    cash: this.cash,
    totalEquity: this.totalEquity,
    realizedPnL: this.realizedPnL,
    unrealizedPnL: this.unrealizedPnL,
    dayChange: this.dayChange,
    totalReturn: this.totalReturn,
    positions: decoratedPositions,
    totalInvested,
  };
};

// Indexes
portfolioSchema.index({ userId: 1 }, { unique: true });
portfolioSchema.index({ "positions.symbol": 1 });
export const Portfolio: mongoose.Model<IPortfolio> =
  (mongoose.models.Portfolio as mongoose.Model<IPortfolio>) ||
  mongoose.model<IPortfolio>("Portfolio", portfolioSchema);
