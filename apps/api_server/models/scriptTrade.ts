import mongoose, { Document, Schema } from "mongoose";

export interface IScriptTrade extends Document {
  userId: mongoose.Types.ObjectId;
  scriptName: string;
  trades: mongoose.Types.ObjectId[];
}

const ScriptTradeSchema = new Schema<IScriptTrade>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  scriptName: { type: String, required: true },
  trades: [{ type: Schema.Types.ObjectId, ref: "Trade" }], // store array of trade IDs
});

export const ScriptTrade: mongoose.Model<IScriptTrade> =
    (mongoose.models.ScriptTrade as mongoose.Model<IScriptTrade>) ||
    mongoose.model<IScriptTrade>("ScriptTrade", ScriptTradeSchema);
