import { Router } from "express";
import { protectRoute } from "../../../middleware/authMiddleware";
import { internalAuth } from "../../../middleware/internalAuthMiddleware";
import { trade } from "../controllers/trades.controllers";
import type { Router as ExpressRouter } from "express";
const tradeRoutes: ExpressRouter = Router();

// User trade route (JWT protected)
tradeRoutes.post("/", protectRoute, trade);

// Internal trade route (for API server calls)
tradeRoutes.post("/internal", internalAuth, trade);

// TODO add a route for backtesting trades
export { tradeRoutes };
