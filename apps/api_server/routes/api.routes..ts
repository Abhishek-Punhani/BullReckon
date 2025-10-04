import { Router } from "express";
import { apiKeyController } from "../contollers/api.controller";
import {
  marketController,
  tradingController,
} from "../contollers/market.controller";
import { protectRoute } from "../../../middleware/authMiddleware";
import { authenticateApiKey } from "../apiMiddleware";

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
// POST /api/trade
apiRoutes.post("/trade", authenticateApiKey, tradingController.executeTrade);

export default apiRoutes;
