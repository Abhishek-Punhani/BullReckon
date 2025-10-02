import mongoose, { Document, Schema } from "mongoose";

export interface IApiKey extends Document {
  _id: string;
  privateKey: string;
  email: string;
  // Usage tracking
  requestsUsed: number;
  lastUsedAt?: Date;

  // Status and limits
  isActive: boolean;
  expiresAt?: Date;
  rateLimit: {
    maxPerMinute: number;
    currentCount: number;
    windowStart: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    privateKey: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    // Usage tracking
    requestsUsed: {
      type: Number,
      default: 0,
    },
    lastUsedAt: Date,

    // Status and limits
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: Date,

    rateLimit: {
      maxPerMinute: { type: Number, default: 15 },
      currentCount: { type: Number, default: 0 },
      windowStart: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
apiKeySchema.index({ email: 1, isActive: 1 });

export const ApiKey = mongoose.model<IApiKey>("ApiKey", apiKeySchema);
