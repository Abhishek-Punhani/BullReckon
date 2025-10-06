"use client";
import { Job } from "bullmq";
import { Trade } from "../models/trade";
import { Portfolio } from "../models/portfolio";
import { fetchLivePrice } from "../utils/fetchPrice";
import { sendTradeConfirmationEmail } from "../utils/emailUtils";
import { PendingOrderJobData } from "../queue.setup";
import { logScriptTrade } from "../utils/scriptTradeLogger";
import { RiskManagementService } from "../services/riskManagement.service";
import { addCalcEmailJob } from "../queue.setup";
import { riskAlertEmail } from "../emails/riskAlertEmail";
import { RiskAction } from "../models/riskAction";
import { getUserEmail } from "../utils/userResolver";

export async function processPendingOrder(job: Job<PendingOrderJobData>) {
  const { tradeId, userId, symbol, action, orderType, limitPrice, stopPrice } =
    job.data;

  try {
    console.log(`🔄 Processing pending order: ${tradeId} for ${symbol}`);

    // Find the pending trade
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      console.log(`⚠️ Trade ${tradeId} not found`);
      return { success: false, reason: "Trade not found" };
    }

    if (trade.status !== "pending") {
      console.log(
        `⚠️ Trade ${tradeId} is no longer pending (status: ${trade.status})`
      );
      return { success: false, reason: "Trade not pending" };
    }

    const currentPrice = await fetchLivePrice(symbol);

    let shouldExecute = false;
    let executionPrice = currentPrice;

    // Check execution conditions based on order type
    switch (orderType) {
      case "limit":
        // Limit Buy: Execute when price <= limit price (buy at or below)
        // Limit Sell: Execute when price >= limit price (sell at or above)
        if (
          (action === "BUY" && currentPrice <= limitPrice!) ||
          (action === "SELL" && currentPrice >= limitPrice!)
        ) {
          shouldExecute = true;
          executionPrice = limitPrice!;
        }
        break;

      case "stop_loss":
        // Stop Loss Buy: Execute when price >= stop price (breakout buy)
        if (action === "BUY" && currentPrice >= stopPrice!) {
          shouldExecute = true;
          executionPrice = currentPrice; // Execute at market price when triggered
        }
        // Stop Loss Sell: Execute when price <= stop price (stop loss sell)
        if (action === "SELL" && currentPrice <= stopPrice!) {
          shouldExecute = true;
          executionPrice = currentPrice; // Execute at market price when triggered
        }
        break;

      case "take_profit":
        // Take Profit Sell: Execute when price >= stop price (profit target reached)
        if (action === "SELL" && currentPrice >= stopPrice!) {
          shouldExecute = true;
          executionPrice = currentPrice; // Execute at market price when triggered
        }
        break;
    }

    // Check risk settings before executing
    const riskService = new RiskManagementService();
    const validation = await riskService.validateTradeRisk(
      userId,
      symbol,
      action,
      trade.quantity,
      executionPrice
    );

    if (!validation.allowed) {
      // Log trade blocked action
      await RiskAction.create({
        userId,
        action: "TRADE_BLOCKED",
        symbol,
        quantity: trade.quantity,
        price: executionPrice,
        reason: "Trade blocked due to risk violation",
        violations: validation.violations,
        status: "executed",
      });

      // Send alert email
      const userEmail = await getUserEmail(userId);
      if (userEmail) {
        await addCalcEmailJob({
          type: "custom",
          to: userEmail,
          subject: "🚨 Risk Alert: Trade Blocked",
          customHtml: riskAlertEmail({
            reason: "Trade blocked due to risk violation",
            details: validation.violations.join(", "),
            tradeInfo: {
              symbol,
              action,
              quantity: trade.quantity,
              price: executionPrice,
            },
          }),
        });
      }

      return {
        success: false,
        reason: "Risk limit exceeded",
        violations: validation.violations,
      };
    }

    if (shouldExecute) {
      // Execute the trade
      await executeTrade(
        trade,
        executionPrice,
        job.data.scriptName ?? undefined,
        job.data.confidence ?? undefined,
        job.data.reason ?? undefined
      );
      console.log(`✅ Executed pending order ${tradeId} at ${executionPrice}`);
      return { success: true, executedAt: executionPrice };
    } else {
      // Conditions not met - throw error to trigger retry with delay
      // BullMQ will automatically retry based on queue configuration
      console.log(
        `⏸️ Order ${tradeId} conditions not met (current: ${currentPrice}, limit: ${limitPrice}, stop: ${stopPrice}), will retry...`
      );
      throw new Error("ORDER_CONDITIONS_NOT_MET");
    }
  } catch (error: any) {
    // Don't log errors for conditions not met (expected behavior)
    if (error.message === "ORDER_CONDITIONS_NOT_MET") {
      throw error; // Let BullMQ handle retry
    }
    console.error(`❌ Error processing pending order ${tradeId}:`, error);
    throw error;
  }
}

async function executeTrade(
  trade: any,
  price: number,
  scriptName?: string,
  confidence?: number,
  reason?: string
): Promise<void> {
  // Update trade status
  trade.status = "executed";
  trade.triggerPrice = price;
  trade.executedAt = new Date();

  // Update portfolio
  const portfolio = await Portfolio.findOne({ userId: trade.userId });
  if (!portfolio) {
    throw new Error("Portfolio not found");
  }

  if (trade.action === "BUY") {
    const totalCost = price * trade.quantity + trade.fees;
    if (portfolio.cash < totalCost) {
      trade.status = "cancelled";
      trade.errorMessage = "Insufficient cash";
      await trade.save();
      throw new Error("Insufficient cash");
    }
    portfolio.cash -= totalCost;
    portfolio.addPosition(trade.symbol, trade.quantity, price);
  } else if (trade.action === "SELL") {
    const position = portfolio.positions.find(
      (p: any) => p.symbol === trade.symbol
    );
    if (!position || position.quantity < trade.quantity) {
      trade.status = "cancelled";
      trade.errorMessage = "Insufficient holdings";
      await trade.save();
      throw new Error("Insufficient holdings");
    }
    const proceeds = price * trade.quantity - trade.fees;
    portfolio.cash += proceeds;
    portfolio.removePosition(trade.symbol, trade.quantity);
    // Update realizedPnL only for executed SELL trades
    const realizedPnL =
      (price - position.avgBuyPrice) * trade.quantity - trade.fees;
    portfolio.realizedPnL += realizedPnL;
    trade.realizedPnL = realizedPnL;
  }

  await portfolio.save();
  await trade.save();

  // Log script trade if scriptName exists (from job data)
  if (scriptName) {
    await logScriptTrade(trade.userId, scriptName, {
      tradeId: trade._id,
      confidence: confidence ?? undefined,
      reason: reason ?? undefined,
    });
  }

  sendTradeConfirmationEmail(
    trade.userId.toString(),
    trade.symbol,
    trade.action,
    trade.quantity,
    price,
    price * trade.quantity
  ).catch((error) => {
    console.error("Failed to send trade confirmation email:", error);
  });
}
