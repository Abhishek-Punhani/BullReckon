import { Router } from "express";
import { internalAuth } from "../../../middleware/internalAuthMiddleware";
import {
  getStockQuote,
  getHistoricalData,
  searchStocks,
  getMultipleQuotes,
  getMarketStats,
  clearCache,
  getLivePrice,
  getCompanyInfo,
} from "../controllers/market.controllers";
import { protectRoute } from "middleware/authMiddleware";

const marketRoutes: Router = Router();

// Stock quote routes
marketRoutes.get("/quote/:symbol", getStockQuote);
marketRoutes.get("/historical/:symbol", getHistoricalData);
marketRoutes.get("/company/:symbol", getCompanyInfo);
marketRoutes.post("/quotes", getMultipleQuotes);

// Search routes
marketRoutes.get("/search", searchStocks);

// Service management routes
marketRoutes.get("/stats", getMarketStats);
marketRoutes.delete("/cache", clearCache);

// internal routes
marketRoutes.get("/internal/quote/:symbol", internalAuth, getStockQuote);

// long polling route for prices
marketRoutes.get("/long-poll/prices", protectRoute, getLivePrice);

export { marketRoutes };
