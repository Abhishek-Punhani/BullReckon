import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Portfolio, Trade } from "../models";
import { validateTradeInput } from "../validations/tradeValidator";
import { executeOrder } from "../utils/orderExecutor";
import { ErrorHandling } from "../../../middleware/errorHandler";
import { fetchLivePrice } from "../utils/fetchPrice";
import { AuthenticatedRequest } from "../../../types/auth";
import { sendTradeConfirmationEmail } from "../utils/emailUtils";
import { logScriptTrade } from "../utils/scriptTradeLogger";

// Add a type declaration for global.queueManager
declare global {
  // Adjust the type below to match your actual queueManager implementation
  var queueManager: {
    addPendingOrderJob?: (params: {
      tradeId: string;
      userId: string;
      symbol: string;
      action: string;
      quantity: number;
      orderType: string;
      limitPrice?: number;
      stopPrice?: number;
      triggerPrice: number;
    }) => Promise<void>;
  };
}

export const trade = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validation = validateTradeInput(req);
    if (!validation.valid) {
      const errorMsg =
        validation.errors && validation.errors.length > 0
          ? validation.errors.join(", ")
          : "Validation error in trades";
      return next(new ErrorHandling(errorMsg, 400));
    }

    const {
      symbol,
      action,
      quantity,
      source,
      limitPrice,
      stopPrice,
      stopLoss,
      takeProfit,
    } = req.body;
    const userId = req.user._id;
    const currentPrice = await fetchLivePrice(symbol);

    // Find or create portfolio
    let portfolio = await Portfolio.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!portfolio) {
      portfolio = new Portfolio({ userId, cash: 100000, positions: [] });
    }

    console.log("Current Price:", currentPrice);

    // CRITICAL: For ALL sell orders (immediate or pending), check holdings first
    if (action === "SELL") {
      const position = portfolio.positions.find(
        (p: any) => p.symbol === symbol
      );
      if (!position || position.quantity < quantity) {
        return res.status(400).json({
          error: "Insufficient holdings",
          message: `You don't have enough ${symbol} to sell. Available: ${position?.quantity || 0}, Requested: ${quantity}`,
        });
      }
    }

    // Check execution condition
    const { execute, executionPrice, status } = executeOrder({
      source,
      action,
      currentPrice,
      limitPrice,
      stopPrice,
    });

    // Create Trade object
    const tradeValue = (executionPrice ?? currentPrice) * quantity;
    const tempTrade = new Trade({
      userId,
      symbol,
      action,
      quantity,
      triggerPrice: executionPrice ?? currentPrice,
      fees: tradeValue * 0.001,
      total: tradeValue,
      source,
      limitPrice:
        source === "limit" && limitPrice !== undefined ? limitPrice : undefined,
      stopPrice:
        (source === "stop_loss" || source === "take_profit") &&
        stopPrice !== undefined
          ? stopPrice
          : undefined,
      status,
      executedAt: execute ? new Date() : null,
      // Snapshot of market data at order time
      marketData: {
        open: currentPrice,
        high: currentPrice,
        low: currentPrice,
        close: currentPrice,
        volume: 0,
      },
    });

    // If executed now
    if (execute && executionPrice) {
      if (action === "BUY") {
        if (portfolio.cash < tradeValue) {
          return res.status(400).json({ error: "Insufficient cash" });
        }
        portfolio.cash -= tradeValue;
        portfolio.addPosition(symbol, quantity, executionPrice);
      } else if (action === "SELL") {
        const position = portfolio.positions.find(
          (p: any) => p.symbol === symbol
        );
        if (!position || position.quantity < quantity) {
          return res.status(400).json({
            error: "Insufficient holdings",
            message: `You don't have enough ${symbol} to sell. Available: ${position?.quantity || 0}, Requested: ${quantity}`,
          });
        }
        portfolio.cash += tradeValue;
        portfolio.removePosition(symbol, quantity);
        // Update realizedPnL only for executed SELL trades
        const realizedPnL =
          (executionPrice - position.avgBuyPrice) * quantity - tempTrade.fees;
        portfolio.realizedPnL += realizedPnL;
        tempTrade.realizedPnL = realizedPnL;
      }
      await portfolio.save();
    } else {
      // For pending orders, validate holdings for SELL orders
      if (action === "SELL") {
        const position = portfolio.positions.find(
          (p: any) => p.symbol === symbol
        );
        if (!position || position.quantity < quantity) {
          return res.status(400).json({
            error: "Insufficient holdings",
            message: `Cannot place pending sell order. You don't have enough ${symbol}. Available: ${position?.quantity || 0}, Requested: ${quantity}`,
          });
        }
      }

      tempTrade.status = "pending";

      // Add to queue if available
      if (global.queueManager?.addPendingOrderJob) {
        await global.queueManager.addPendingOrderJob({
          tradeId: tempTrade._id.toString(),
          userId,
          symbol,
          action,
          quantity,
          orderType:
            source === "limit"
              ? "limit"
              : source === "stop_loss"
                ? "stop_loss"
                : "take_profit",
          limitPrice,
          stopPrice,
          triggerPrice: currentPrice,
        });
      }
    }

    await tempTrade.save();

    // Track created trades for response
    const createdTrades = [tempTrade];

    // CRITICAL: If the main order executed and it was a BUY with stopLoss or takeProfit, create additional pending orders
    if (execute && action === "BUY") {
      console.log(
        `🔍 Checking for SL/TP: stopLoss=${stopLoss}, takeProfit=${takeProfit}`
      );

      // Create stop loss order (SELL when price drops)
      if (stopLoss && stopLoss > 0) {
        const stopLossTrade = new Trade({
          userId,
          symbol,
          action: "SELL",
          quantity,
          triggerPrice: currentPrice,
          fees: stopLoss * quantity * 0.001,
          total: stopLoss * quantity,
          source: "stop_loss",
          stopPrice: stopLoss,
          status: "pending",
          executedAt: null,
          marketData: {
            open: currentPrice,
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
            volume: 0,
          },
        });
        await stopLossTrade.save();
        createdTrades.push(stopLossTrade);

        // Queue the stop loss order
        if (global.queueManager?.addPendingOrderJob) {
          await global.queueManager.addPendingOrderJob({
            tradeId: stopLossTrade._id.toString(),
            userId,
            symbol,
            action: "SELL",
            quantity,
            orderType: "stop_loss",
            stopPrice: stopLoss,
            triggerPrice: currentPrice,
          });
        }
        console.log(`✅ Stop Loss order created at $${stopLoss} for ${symbol}`);
      }

      // Create take profit order (SELL when price rises)
      if (takeProfit && takeProfit > 0) {
        const takeProfitTrade = new Trade({
          userId,
          symbol,
          action: "SELL",
          quantity,
          triggerPrice: currentPrice,
          fees: takeProfit * quantity * 0.001,
          total: takeProfit * quantity,
          source: "take_profit",
          stopPrice: takeProfit,
          status: "pending",
          executedAt: null,
          marketData: {
            open: currentPrice,
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
            volume: 0,
          },
        });
        await takeProfitTrade.save();
        createdTrades.push(takeProfitTrade);

        // Queue the take profit order
        if (global.queueManager?.addPendingOrderJob) {
          await global.queueManager.addPendingOrderJob({
            tradeId: takeProfitTrade._id.toString(),
            userId,
            symbol,
            action: "SELL",
            quantity,
            orderType: "take_profit",
            stopPrice: takeProfit,
            triggerPrice: currentPrice,
          });
        }
        console.log(
          `✅ Take Profit order created at $${takeProfit} for ${symbol}`
        );
      }
    }

    // After saving each trade, log it if scriptName and metadata are present
    const { scriptName, confidence, reason } = req.body;
    for (const t of createdTrades) {
      if (scriptName) {
        await logScriptTrade(userId, scriptName, {
          tradeId: t._id,
          confidence,
          reason,
        });
      }
    }

    if (execute) {
      sendTradeConfirmationEmail(
        userId,
        symbol,
        action,
        quantity,
        executionPrice!,
        tradeValue
      ).catch((error) => {
        console.error("Failed to send trade confirmation email:", error);
      });
    }

    return res.json({
      success: true,
      message: execute
        ? `Trade executed${createdTrades.length > 1 ? ` with ${createdTrades.length - 1} additional pending order(s)` : ""}`
        : "Order placed (pending)",
      data: {
        trade: tempTrade,
        portfolio,
        allTrades: createdTrades, // Include all created trades (main + SL + TP)
        pendingOrders: createdTrades.length - 1, // Number of additional pending orders
      },
    });
  } catch (err) {
    next(err);
  }
};
