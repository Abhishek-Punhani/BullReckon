import { Router } from "express";
import { apiKeyController } from "../contollers/api.controller";
import {
  marketController,
  tradingController,
} from "../contollers/market.controller";
import { protectRoute } from "../../../middleware/authMiddleware";
import { internalAuth } from "../../../middleware/internalAuthMiddleware";
import { authenticateApiKey } from "../apiMiddleware";
import backtestRoutes from "./backtest.routes";
import { ErrorHandling } from "../../../middleware/errorHandler";
import { ScriptTrade } from "../models/scriptTrade";

const apiRoutes: Router = Router();

// API Key Management Routes (JWT Protected)
// POST /api/keys/generate
apiRoutes.post("/keys/generate", protectRoute, apiKeyController.generateApiKey);

// GET /api/keys
apiRoutes.get("/keys", protectRoute, apiKeyController.getUserApiKeys);

// DELETE /api/keys/:keyId
apiRoutes.delete("/keys/:keyId", protectRoute, apiKeyController.revokeApiKey);

// Market Data Routes (API Key Protected)
// GET /api/market/quote/:symbol
apiRoutes.get(
  "/market/quote/:symbol",
  authenticateApiKey,
  marketController.getQuote
);

// GET /api/market/historical/:symbol?period=1d
// OR for backtest: GET /api/market/historical/:symbol?interval=1h&start=2023-01-01T00:00:00Z&end=2023-12-31T23:59:59Z
apiRoutes.get(
  "/market/historical/:symbol",
  authenticateApiKey,
  marketController.getHistoricalData
);

// GET /api/market/company/:symbol
apiRoutes.get(
  "/market/company/:symbol",
  authenticateApiKey,
  marketController.getCompanyInfo
);

// Trading Routes (API Key Protected)
apiRoutes.post("/trade", authenticateApiKey, tradingController.executeTrade);

// Get trades by script name (populate trade details)
apiRoutes.get(
  "/trades/by-script/:scriptName",
  authenticateApiKey,
  async (req, res, next) => {
    try {
      const { scriptName } = req.params;
      if (!scriptName) {
        return next(new ErrorHandling("Script name required", 400));
      }
      // Find ScriptTrade and populate trades array
      const scriptTrade = await ScriptTrade.findOne({ scriptName }).populate(
        "trades"
      );
      res.json({ success: true, trades: scriptTrade?.trades || [] });
    } catch (err) {
      next(err);
    }
  }
);

// Internal Routes (Service-to-Service)
// GET /api/internal/market/historical/:symbol - for backtesting services
apiRoutes.get(
  "/internal/market/historical/:symbol",
  internalAuth,
  marketController.getHistoricalData
);

// Backtesting Routes (API Key Protected)
apiRoutes.use("/backtest", authenticateApiKey, backtestRoutes);

export default apiRoutes;
