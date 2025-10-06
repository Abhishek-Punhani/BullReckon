import mongoose, { Document, Schema } from "mongoose";

export interface IPortfolioSnapshot extends Document {
  userId: mongoose.Types.ObjectId;
  totalValue: number;
  cash: number;
  positionsValue: number;
  timestamp: Date;
  isPeak: boolean; // Mark as peak value for drawdown calculation
}

const portfolioSnapshotSchema = new Schema<IPortfolioSnapshot>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    totalValue: {
      type: Number,
      required: true,
    },
    cash: {
      type: Number,
      required: true,
    },
    positionsValue: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isPeak: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for efficient peak queries
portfolioSnapshotSchema.index({ userId: 1, isPeak: 1, timestamp: -1 });

export const PortfolioSnapshot: mongoose.Model<IPortfolioSnapshot> =
  (mongoose.models.PortfolioSnapshot as mongoose.Model<IPortfolioSnapshot>) ||
  mongoose.model<IPortfolioSnapshot>(
    "PortfolioSnapshot",
    portfolioSnapshotSchema
  );
