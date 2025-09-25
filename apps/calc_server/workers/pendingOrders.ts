import { Job } from "bullmq";
import { PendingOrderJobData } from "../../../shared/queueManager";
import { Trade } from "../../../packages/models/trade";
import { Portfolio } from "../../../packages/models/portfolio";
import { fetchLivePrice } from "../controllers/trades.controllers";

export async function processPendingOrder(job: Job<PendingOrderJobData>) {
  const { tradeId, userId, symbol, action, orderType, limitPrice, stopPrice } =
    job.data;

  try {
    console.log(`🔄 Processing pending order: ${tradeId} for ${symbol}`);

    // Find the pending trade
    const trade = await Trade.findById(tradeId);
    if (!trade || trade.status !== "pending") {
      console.log(`⚠️ Trade ${tradeId} not found or not pending`);
      await job.remove();
      return { success: false, reason: "Trade not pending" };
    }

    // Get current market price (mock for now)
    const currentPrice = await fetchLivePrice(symbol);

    let shouldExecute = false;
    let executionPrice = currentPrice;

    // Check execution conditions
    switch (orderType) {
      case "limit":
        if (
          (action === "BUY" && currentPrice <= limitPrice!) ||
          (action === "SELL" && currentPrice >= limitPrice!)
        ) {
          shouldExecute = true;
          executionPrice = limitPrice!;
        }
        break;

      case "stop_loss":
        if (action === "SELL" && currentPrice <= stopPrice!) {
          shouldExecute = true;
          executionPrice = stopPrice!;
        }
        break;

      case "take_profit":
        if (action === "SELL" && currentPrice >= stopPrice!) {
          shouldExecute = true;
          executionPrice = stopPrice!;
        }
        break;
    }

    if (shouldExecute) {
      // Execute the trade
      await executeTrade(trade, executionPrice);
      console.log(`✅ Executed pending order ${tradeId} at ${executionPrice}`);
      return { success: true, executedAt: executionPrice };
    } else {
      // Re-queue for later processing
      console.log(`⏸️ Order ${tradeId} conditions not met, re-queuing`);
      // Re-add the job to the queue with a delay for later processing
      await job.moveToDelayed(Date.now() + 60 * 1000);
      return { success: false, reason: "Conditions not met, re-queued" };
    }
  } catch (error) {
    console.error(`❌ Error processing pending order ${tradeId}:`, error);
    throw error;
  }
}



async function executeTrade(trade: any, price: number): Promise<void> {
  // Update trade status
  trade.status = "executed";
  trade.triggerPrice = price;
  trade.executedAt = new Date();

  // Update portfolio
  const portfolio = await Portfolio.findOne({ userId: trade.userId });
  if (portfolio) {
    if (trade.action === "BUY") {
      portfolio.cash -= price * trade.quantity + trade.fees;
      portfolio.addPosition(trade.symbol, trade.quantity, price);
    } else {
      portfolio.cash += price * trade.quantity - trade.fees;
      portfolio.removePosition(trade.symbol, trade.quantity);
    }
    await portfolio.save();
  }

  await trade.save();
}
