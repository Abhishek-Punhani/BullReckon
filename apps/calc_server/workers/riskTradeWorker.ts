import { Job } from "bullmq";
import { Trade } from "../models/trade";
import { Portfolio } from "../models/portfolio";
import { fetchLivePrice } from "../utils/fetchPrice";
import { sendTradeConfirmationEmail } from "../utils/emailUtils";

export interface RiskTradeJobData {
  tradeId: string;
  userId: string;
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  orderType: "market" | "limit";
  priority: "urgent" | "high" | "normal";
  reason: string;
}

/**
 * Worker to process risk-triggered trades (stop loss, take profit)
 */
export async function processRiskTrade(job: Job<RiskTradeJobData>) {
  const { tradeId, userId, symbol, action, quantity, orderType, reason } =
    job.data;

  try {
    console.log(
      `🔄 Processing risk trade: ${tradeId} for ${symbol} (${reason})`
    );

    const currentPrice = await fetchLivePrice(symbol);

    // Update portfolio
    const portfolio = await Portfolio.findOne({ userId });
    if (!portfolio) {
      throw new Error("Portfolio not found");
    }

    if (action === "SELL") {
      const position = portfolio.positions.find(
        (p: any) => p.symbol === symbol
      );
      if (!position || position.quantity < quantity) {
        throw new Error("Insufficient holdings");
      }

      const proceeds = currentPrice * quantity;
      const fees = proceeds * 0.001;
      const netProceeds = proceeds - fees;

      portfolio.cash += netProceeds;
      portfolio.removePosition(symbol, quantity);

      // Calculate realized P&L
      const realizedPnL =
        (currentPrice - position.avgBuyPrice) * quantity - fees;
      portfolio.realizedPnL += realizedPnL;

      await portfolio.save();

      // Create trade record
      const trade = new Trade({
        userId,
        symbol,
        action,
        quantity,
        triggerPrice: currentPrice,
        fees,
        total: proceeds,
        status: "executed",
        executedAt: new Date(),
        realizedPnL,
        source: reason.includes("stop") ? "risk-stop-loss" : "risk-take-profit",
      });
      await trade.save();

      // Send confirmation email
      await sendTradeConfirmationEmail(
        userId.toString(),
        symbol,
        action,
        quantity,
        currentPrice,
        proceeds
      );

      console.log(
        `✅ Risk trade executed: ${symbol} ${action} ${quantity} @ $${currentPrice} (${reason})`
      );
      return { success: true, price: currentPrice, realizedPnL };
    }
  } catch (error: any) {
    console.error(`❌ Error processing risk trade ${tradeId}:`, error);
    throw error;
  }
}
