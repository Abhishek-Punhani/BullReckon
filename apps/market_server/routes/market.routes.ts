import { Router } from "express";
import {
  getStockQuote,
  getHistoricalData,
  searchStocks,
  getMultipleQuotes,
  getMarketStats,
  clearCache,
} from "../controllers/market.controllers";

const marketRoutes = Router();

// Stock quote routes
marketRoutes.get("/quote/:symbol", getStockQuote);
marketRoutes.get("/historical/:symbol", getHistoricalData);
marketRoutes.post("/quotes", getMultipleQuotes);

// Search routes
marketRoutes.get("/search", searchStocks);

// Service management routes
marketRoutes.get("/stats", getMarketStats);
marketRoutes.delete("/cache", clearCache);

export { marketRoutes };
