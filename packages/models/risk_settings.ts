import mongoose, { Document, Schema } from "mongoose";

export interface IRiskSettings extends Document {
  userId: mongoose.Types.ObjectId;

  // Stop Loss Configuration
  stopLossPercentage: number; // Default 5%
  autoStopLossEnabled: boolean;
  trailingStopEnabled: boolean;
  trailingStopPercentage?: number;

  // Take Profit Configuration
  takeProfitPercentage: number; // Default 10%
  autoTakeProfitEnabled: boolean;

  // Portfolio Risk Limits
  maxDrawdownPercentage: number; // Default 20%
  dailyLossLimit?: number; // Dollar amount

  // Position Sizing
  capitalAllocationPercentage: number; // Default 25% per trade
  positionSizingEnabled: boolean;
  maxPositionsAllowed: number; // Default 10

  // Risk Presets
  riskPreset: "conservative" | "moderate" | "aggressive" | "custom";

  // methods
  applyRiskPreset(preset: string): void;
  calculateRiskScore(): number; // 1-10 scale

  // Virtuals
  // riskScore: number; --- IGNORE ---

  // Advanced Settings
  correlationRiskEnabled: boolean; // Prevent similar stocks
  sectorConcentrationLimit: number; // Max % in one sector

  // Risk Alerts
  alertsEnabled: boolean;
  notificationChannels: ("email" | "sms" | "push")[];

  // Timestamps
  lastUpdated: Date;
  createdAt: Date;
}

const riskSettingsSchema = new Schema<IRiskSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    stopLossPercentage: {
      type: Number,
      required: true,
      min: [0.5, "Stop loss must be at least 0.5%"],
      max: [50, "Stop loss cannot exceed 50%"],
      default: 5.0,
    },

    autoStopLossEnabled: {
      type: Boolean,
      default: true,
    },

    trailingStopEnabled: {
      type: Boolean,
      default: false,
    },

    trailingStopPercentage: {
      type: Number,
      min: [1, "Trailing stop must be at least 1%"],
      max: [30, "Trailing stop cannot exceed 30%"],
      default: 5.0,
    },

    takeProfitPercentage: {
      type: Number,
      required: true,
      min: [1, "Take profit must be at least 1%"],
      max: [100, "Take profit cannot exceed 100%"],
      default: 10.0,
    },

    autoTakeProfitEnabled: {
      type: Boolean,
      default: true,
    },

    maxDrawdownPercentage: {
      type: Number,
      required: true,
      min: [5, "Max drawdown must be at least 5%"],
      max: [80, "Max drawdown cannot exceed 80%"],
      default: 20.0,
    },

    dailyLossLimit: {
      type: Number,
      min: [0, "Daily loss limit cannot be negative"],
      validate: {
        validator: function (value: number) {
          return !value || value >= 100; // If set, must be at least $100
        },
        message: "Daily loss limit must be at least $100 if specified",
      },
    },

    capitalAllocationPercentage: {
      type: Number,
      required: true,
      min: [1, "Capital allocation must be at least 1%"],
      max: [100, "Capital allocation cannot exceed 100%"],
      default: 25.0,
    },

    positionSizingEnabled: {
      type: Boolean,
      default: true,
    },

    maxPositionsAllowed: {
      type: Number,
      min: [1, "Must allow at least 1 position"],
      max: [50, "Cannot exceed 50 positions"],
      default: 10,
    },

    riskPreset: {
      type: String,
      enum: ["conservative", "moderate", "aggressive", "custom"],
      default: "moderate",
    },

    correlationRiskEnabled: {
      type: Boolean,
      default: false,
    },

    sectorConcentrationLimit: {
      type: Number,
      min: [10, "Sector limit must be at least 10%"],
      max: [100, "Sector limit cannot exceed 100%"],
      default: 40.0,
    },

    alertsEnabled: {
      type: Boolean,
      default: true,
    },

    notificationChannels: [
      {
        type: String,
        enum: ["email", "sms", "push"],
      },
    ],

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Apply risk preset configurations
riskSettingsSchema.methods.applyRiskPreset = function (preset: string) {
  const presets = {
    conservative: {
      stopLossPercentage: 2.0,
      takeProfitPercentage: 5.0,
      maxDrawdownPercentage: 10.0,
      capitalAllocationPercentage: 10.0,
      maxPositionsAllowed: 15,
    },
    moderate: {
      stopLossPercentage: 5.0,
      takeProfitPercentage: 10.0,
      maxDrawdownPercentage: 20.0,
      capitalAllocationPercentage: 25.0,
      maxPositionsAllowed: 10,
    },
    aggressive: {
      stopLossPercentage: 10.0,
      takeProfitPercentage: 20.0,
      maxDrawdownPercentage: 35.0,
      capitalAllocationPercentage: 40.0,
      maxPositionsAllowed: 8,
    },
  };

  const config = presets[preset as keyof typeof presets];
  if (config) {
    Object.assign(this, config);
    this.riskPreset = preset;
    this.lastUpdated = new Date();
  }
};

// Calculate risk score (1-10)
riskSettingsSchema.methods.calculateRiskScore = function (): number {
  const stopRisk = (this.stopLossPercentage / 20) * 3; // Max 3 points
  const profitRisk = (this.takeProfitPercentage / 50) * 2; // Max 2 points
  const drawdownRisk = (this.maxDrawdownPercentage / 80) * 3; // Max 3 points
  const allocationRisk = (this.capitalAllocationPercentage / 100) * 2; // Max 2 points

  return Math.min(
    10,
    Math.round(stopRisk + profitRisk + drawdownRisk + allocationRisk)
  );
};

// Auto-update lastUpdated on save
riskSettingsSchema.pre("save", function (next) {
  this.lastUpdated = new Date();
  next();
});

riskSettingsSchema.index({ userId: 1 }, { unique: true });

export const RiskSettings =
  mongoose.models.RiskSettings ||
  mongoose.model<IRiskSettings>("RiskSettings", riskSettingsSchema);
