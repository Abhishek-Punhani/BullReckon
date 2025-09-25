import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Portfolio, Trade } from "../../../packages/models";
import { validateTradeInput } from "../validations/tradeValidator";
import { executeOrder } from "../utils/orderExecutor";
import { ErrorHandling } from "../../../middleware/errorHandler";

export const trade = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate input
    const validation = validateTradeInput(req);
    if (!validation.valid) {
      const errorMsg =
        validation.errors && validation.errors.length > 0
          ? validation.errors.join(", ")
          : "Validation error in trades";
      return next(new ErrorHandling(errorMsg, 400));
    }

    const {
      userId,
      symbol,
      action,
      quantity,
      source,
      limitPrice,
      stopPrice,
      strategyId,
    } = req.body;

    // Fetch latest market price (replace with live market feed API)
    const currentPrice = await fetchLivePrice(symbol);

    // Find or create portfolio
    let portfolio = await Portfolio.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!portfolio) {
      portfolio = new Portfolio({ userId, cash: 100000, positions: [] });
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
      strategyId,
      limitPrice,
      stopPrice,
      status,
      executedAt: execute ? new Date() : null,
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
        const position = portfolio.positions.find((p) => p.symbol === symbol);
        if (!position || position.quantity < quantity) {
          return res.status(400).json({ error: "Insufficient holdings" });
        }
        portfolio.cash += tradeValue;
        portfolio.removePosition(symbol, quantity);
      }
      await portfolio.save();
    } else {
      tempTrade.status = "pending";
      // TODO
      // Add a Queue Job to monitor market prices and execute when conditions meet
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

// Mock market price fetcher
async function fetchLivePrice(symbol: string): Promise<number> {
  // TODO: replace with real market API
  return 100 + Math.random() * 10;
}
