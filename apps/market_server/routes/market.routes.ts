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
import { protectRoute } from "../../../middleware/authMiddleware";
import { marketCache, companyCache } from "../../../middleware/cacheMiddleware";

const marketRoutes: Router = Router();

// Stock quote routes with caching
marketRoutes.get("/quote/:symbol", marketCache, getStockQuote);
marketRoutes.get("/historical/:symbol", marketCache, getHistoricalData);
marketRoutes.get("/company/:symbol", companyCache, getCompanyInfo);
marketRoutes.post("/quotes", getMultipleQuotes); 

// Search routes with caching
marketRoutes.get("/search", marketCache, searchStocks);

// Service management routes (no caching)
marketRoutes.get("/stats", getMarketStats);
marketRoutes.delete("/cache", clearCache);

// Internal routes with caching
marketRoutes.get(
  "/internal/quote/:symbol",
  internalAuth,
  marketCache,
  getStockQuote
);
marketRoutes.get(
  "/internal/historical/:symbol",
  internalAuth,
  marketCache,
  getHistoricalData
);

marketRoutes.get("/long-poll/prices", protectRoute, getLivePrice);

export { marketRoutes };
