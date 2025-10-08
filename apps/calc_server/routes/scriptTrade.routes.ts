import { Router } from "express";
import { ScriptTrade } from "../models/scriptTrade";
import { Trade } from "../models/trade";
import { protectRoute } from "../../../middleware/authMiddleware";
import { AuthenticatedRequest } from "types/auth";

const router: Router = Router();

// GET /script-trades (get all script trades with details for the authenticated user)
router.get("/", protectRoute, async (req:AuthenticatedRequest, res, next) => {
  try {
    const filter = { userId: req.user._id };
    const scriptTrades = await ScriptTrade.find(filter).lean();

    // Populate trade details for each script
    const scriptsWithTrades = await Promise.all(
      scriptTrades.map(async (scriptTrade) => {
        const populatedTrades = await Promise.all(
          scriptTrade.trades.map(async (tradeInfo) => {
            const trade = await Trade.findById(tradeInfo.tradeId).lean();
            return {
              ...tradeInfo,
              trade: trade,
            };
          })
        );

        return {
          _id: scriptTrade._id,
          scriptName: scriptTrade.scriptName,
          userId: scriptTrade.userId,
          trades: populatedTrades,
        };
      })
    );

    res.json({
      success: true,
      scripts: scriptsWithTrades,
      total: scriptsWithTrades.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /script-trades/:scriptName (populated)
router.get("/:id",protectRoute, async (req:AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "ID required" });
    }
    const scriptTrade = await ScriptTrade.findById(id).lean();
    if (!scriptTrade) {
      return res.status(404).json({ error: "Script trade not found" });
    }
    // Populate trade details
    const populatedTrades = await Promise.all(
      scriptTrade.trades.map(async (tradeInfo) => {
        const trade = await Trade.findById(tradeInfo.tradeId).lean();
        if (!trade || trade.userId.toString() !== req.user._id.toString()) {
          throw new Error("Unauthorized access to trade");
        }
        return {
          ...tradeInfo,
          trade: trade,
        };
      })
    );
    const scriptWithTrades = {
      _id: scriptTrade._id,
      scriptName: scriptTrade.scriptName,
      userId: scriptTrade.userId,
      trades: populatedTrades,
    };
    res.json({ success: true, scriptTrade: scriptWithTrades });
  } catch (err) {
    next(err);
  }
});

export default router;
