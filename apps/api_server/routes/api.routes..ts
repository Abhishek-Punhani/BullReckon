import { Router } from "express";
import { apiKeyController } from "../contollers/api.controller";
import {
  marketController,
  tradingController,
} from "../contollers/market.controller";
import { protectRoute } from "../../../middleware/authMiddleware";
import { authenticateApiKey } from "../apiMiddleware";
import backtestRoutes from "./backtest.routes";
import { ErrorHandling } from "../../../middleware/errorHandler";
import { internalApi } from "../../../shared/internalApi.client";

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

// Get trades by script name (forward to calc_server)
apiRoutes.get(
  "/trades/by-script/:scriptName",
  authenticateApiKey,
  async (req, res, next) => {
    try {
      const { scriptName } = req.params;
      if (!scriptName) {
        return next(new ErrorHandling("Script name required", 400));
      }

      // Forward request to calc_server
      const calcServerUrl =
        process.env.CALC_SERVER_URL || "http://localhost:3003";
      const response = await internalApi.get(
        `${calcServerUrl}/api/script-trades/${scriptName}`
      );

      res.json(response.data);
    } catch (err: any) {
      if (err.response) {
        // Forward the error from calc_server
        res.status(err.response.status).json(err.response.data);
      } else {
        next(err);
      }
    }
  }
);

// Internal Routes (Service-to-Service)
// GET /api/internal/market/historical/:symbol - for backtesting services
apiRoutes.get(
  "/internal/market/historical/:symbol",
  marketController.getHistoricalData
);

// Internal Routes (Service-to-Service)

// Backtesting Routes (API Key Protected)
apiRoutes.use("/backtest", authenticateApiKey, backtestRoutes);

export default apiRoutes;
