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
import cors from "cors";

// Define route-level CORS configs here to avoid circular imports with server.ts
const corsForCookies = {
  origin: (origin: any, callback: any) => callback(null, true),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-api-key",
    "x-api-signature",
    "x-api-timestamp",
    "x-api-email",
  ],
};

const corsForApiKeys = {
  origin: "*", // allow any origin for API-key header flows (no credentials)
  credentials: false,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "x-api-key",
    "x-api-signature",
    "x-api-timestamp",
    "x-api-email",
    "Authorization",
  ],
};

const apiRoutes: Router = Router();

// API Key Management Routes (JWT Protected)
// POST /api/keys/generate
apiRoutes.post(
  "/keys/generate",
  cors(corsForCookies),
  protectRoute,
  apiKeyController.generateApiKey
);

// GET /api/keys
apiRoutes.get(
  "/keys",
  cors(corsForCookies),
  protectRoute,
  apiKeyController.getUserApiKeys
);

// DELETE /api/keys/:keyId
apiRoutes.delete(
  "/keys/:keyId",
  cors(corsForCookies),
  protectRoute,
  apiKeyController.revokeApiKey
);

// Market Data Routes (API Key Protected)
// GET /api/market/quote/:symbol
apiRoutes.get(
  "/market/quote/:symbol",
  cors(corsForApiKeys),
  authenticateApiKey,
  marketController.getQuote
);

// GET /api/market/historical/:symbol?period=1d
// OR for backtest: GET /api/market/historical/:symbol?interval=1h&start=2023-01-01T00:00:00Z&end=2023-12-31T23:59:59Z
apiRoutes.get(
  "/market/historical/:symbol",
  cors(corsForApiKeys),
  authenticateApiKey,
  marketController.getHistoricalData
);

// GET /api/market/company/:symbol
apiRoutes.get(
  "/market/company/:symbol",
  cors(corsForApiKeys),
  authenticateApiKey,
  marketController.getCompanyInfo
);

// Trading Routes (API Key Protected)
apiRoutes.post(
  "/trade",
  cors(corsForApiKeys),
  authenticateApiKey,
  tradingController.executeTrade
);

// Get trades by script name (forward to calc_server)
apiRoutes.get(
  "/trades/by-script/:scriptName",
  cors(corsForApiKeys),
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

// Backtesting Routes (API Key Protected)
apiRoutes.use(
  "/backtest",
  cors(corsForApiKeys),
  authenticateApiKey,
  backtestRoutes
);

export default apiRoutes;
