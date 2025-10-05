import mongoose, { Document, Schema } from "mongoose";

export interface IScriptTrade extends Document {
  userId: mongoose.Types.ObjectId;
  scriptName: string;
  trades: Array<{
    tradeId: mongoose.Types.ObjectId;
    confidence?: number;
    reason?: string;
  }>;
}

const ScriptTradeSchema = new Schema<IScriptTrade>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  scriptName: { type: String, required: true },
  trades: [
    {
      tradeId: { type: Schema.Types.ObjectId, ref: "Trade", required: true },
      confidence: { type: Number },
      reason: { type: String },
    },
  ],
});

export const ScriptTrade: mongoose.Model<IScriptTrade> =
  (mongoose.models.ScriptTrade as mongoose.Model<IScriptTrade>) ||
  mongoose.model<IScriptTrade>("ScriptTrade", ScriptTradeSchema);
