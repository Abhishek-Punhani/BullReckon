import { Router } from "express";
import { internalAuth } from "../../../middleware/internalAuthMiddleware";
import {
  getStockQuote,
  getHistoricalData,
  searchStocks,
  getMultipleQuotes,
  getMarketStats,
  clearCache,
} from "../controllers/market.controllers";

const marketRoutes: Router = Router();

// Health check route
marketRoutes.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "Market Server"
  });
});

// Stock quote routes
marketRoutes.get("/quote/:symbol", getStockQuote);
marketRoutes.get("/historical/:symbol", getHistoricalData);
marketRoutes.post("/quotes", getMultipleQuotes);

// Search routes
marketRoutes.get("/search", searchStocks);

// Service management routes
marketRoutes.get("/stats", getMarketStats);
marketRoutes.delete("/cache", clearCache);

// internal routes
marketRoutes.get("/internal/quote/:symbol", internalAuth, getStockQuote);

export { marketRoutes };
