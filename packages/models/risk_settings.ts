import mongoose, { Document } from 'mongoose';

export interface IRiskSettings extends Document {
  userId: mongoose.Types.ObjectId;
  stopLoss: number;
  takeProfit: number;
  maxDrawdown: number;
  capitalAllocation: number;
  maxOpenPositions: number;
  riskPerTrade: number;
  dailyLossLimit: number;
  tradeFrequencyLimit: number;
  enableAutoStopLoss: boolean;
  enableAutoTakeProfit: boolean;
  validateRiskParams(): boolean;
}

const riskSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
    },
    stopLoss: {
      type: Number,
      required: [true, 'Stop loss percentage is required'],
      min: [0.1, 'Stop loss must be at least 0.1%'],
      max: [50, 'Stop loss cannot exceed 50%'],
      default: 5,
    },
    takeProfit: {
      type: Number,
      required: [true, 'Take profit percentage is required'],
      min: [0.1, 'Take profit must be at least 0.1%'],
      max: [1000, 'Take profit cannot exceed 1000%'],
      default: 10,
    },
    maxDrawdown: {
      type: Number,
      required: [true, 'Max drawdown percentage is required'],
      min: [1, 'Max drawdown must be at least 1%'],
      max: [95, 'Max drawdown cannot exceed 95%'],
      default: 20,
    },
    capitalAllocation: {
      type: Number,
      required: [true, 'Capital allocation percentage is required'],
      min: [1, 'Must allocate at least 1% of capital per trade'],
      max: [100, 'Cannot allocate more than 100% of capital per trade'],
      default: 25,
    },
    maxOpenPositions: {
      type: Number,
      required: [true, 'Max open positions is required'],
      min: [1, 'Must allow at least 1 open position'],
      max: [50, 'Cannot have more than 50 open positions'],
      default: 10,
    },
    riskPerTrade: {
      type: Number,
      required: [true, 'Risk per trade percentage is required'],
      min: [0.1, 'Risk per trade must be at least 0.1%'],
      max: [25, 'Risk per trade cannot exceed 25%'],
      default: 2,
    },
    dailyLossLimit: {
      type: Number,
      min: [0.1, 'Daily loss limit must be at least 0.1%'],
      max: [50, 'Daily loss limit cannot exceed 50%'],
      default: 10,
    },
    tradeFrequencyLimit: {
      type: Number,
      min: [1, 'Must allow at least 1 trade per day'],
      max: [1000, 'Cannot exceed 1000 trades per day'],
      default: 100,
    },
    enableAutoStopLoss: {
      type: Boolean,
      default: true,
    },
    enableAutoTakeProfit: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Validation method
riskSettingsSchema.methods.validateRiskParams = function (): boolean {
  // Stop loss should be less than take profit for reasonable risk/reward
  if (this.stopLoss >= this.takeProfit) {
    return false;
  }
  
  // Capital allocation and risk per trade should be reasonable together
  if (this.capitalAllocation < this.riskPerTrade) {
    return false;
  }
  
  return true;
};

// Pre-save validation
riskSettingsSchema.pre('save', function (next) {
  if (!(this as any).validateRiskParams()) {
    return next(new Error('Invalid risk parameter combination'));
  }
  next();
});

// Indexes
riskSettingsSchema.index({ userId: 1 }, { unique: true });

export const RiskSettings = mongoose.models.RiskSettings || mongoose.model<IRiskSettings>('RiskSettings', riskSettingsSchema);