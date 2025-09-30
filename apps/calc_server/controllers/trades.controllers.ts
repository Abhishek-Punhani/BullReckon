import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Portfolio, Trade } from "../../../packages/models";
import { validateTradeInput } from "../validations/tradeValidator";
import { executeOrder } from "../utils/orderExecutor";
import { ErrorHandling } from "../../../middleware/errorHandler";
import { fetchLivePrice } from "../utils/fetchPrice";
import { AuthenticatedRequest } from "types/auth";

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

    const { symbol, action, quantity, source, limitPrice, stopPrice } =
      req.body;
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
      strategyId: typeof limitPrice !== "undefined" ? limitPrice : undefined,
      limitPrice: typeof limitPrice !== "undefined" ? limitPrice : undefined,
      stopPrice: typeof stopPrice !== "undefined" ? stopPrice : undefined,
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
          return res.status(400).json({ error: "Insufficient holdings" });
        }
        portfolio.cash += tradeValue;
        portfolio.removePosition(symbol, quantity);
      }
      await portfolio.save();
    } else {
      tempTrade.status = "pending";
      global.queueManager?.addPendingOrderJob({
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

    await tempTrade.save();

    return res.json({
      success: true,
      message: execute ? "Trade executed" : "Order placed (pending)",
      data: { trade: tempTrade, portfolio },
    });
  } catch (err) {
    next(err);
  }
};
