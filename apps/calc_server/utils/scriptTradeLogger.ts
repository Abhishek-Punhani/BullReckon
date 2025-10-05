import { ScriptTrade, IScriptTrade } from "../models/scriptTrade";
import { Trade } from "../models/trade";
import mongoose from "mongoose";

/**
 * Log a trade for a script, creating or updating the ScriptTrade document.
 * @param userId - User's ObjectId
 * @param scriptName - Name of the script
 * @param tradeObj - { tradeId, confidence, reason }
 */
export async function logScriptTrade(
  userId: mongoose.Types.ObjectId,
  scriptName: string,
  tradeObj: {
    tradeId: mongoose.Types.ObjectId;
    confidence?: number;
    reason?: string;
  }
) {
  let scriptTrade = await ScriptTrade.findOne({ userId, scriptName });
  if (!scriptTrade) {
    scriptTrade = new ScriptTrade({ userId, scriptName, trades: [tradeObj] });
  } else {
    scriptTrade.trades.push(tradeObj);
  }
  await scriptTrade.save();
  return scriptTrade;
}

/**
 * Fetch a script trade log and populate all trade details.
 */
export async function getScriptTradeLogWithDetails(scriptName: string) {
  const scriptTrade = await ScriptTrade.findOne({ scriptName });
  if (!scriptTrade) return null;
  // Populate each trade object with full trade details
  const populatedTrades = await Promise.all(
    scriptTrade.trades.map(async (t) => {
      const trade = await Trade.findById(t.tradeId);
      return {
        ...t,
        trade: trade ? trade.toObject() : null,
      };
    })
  );
  return {
    ...scriptTrade.toObject(),
    trades: populatedTrades,
  };
}
