import { Router } from "express";
import { protectRoute } from "../../../middleware/authMiddleware";
import { trade } from "../controllers/trades.controllers";
import type { Router as ExpressRouter } from "express";
const tradeRoutes: ExpressRouter = Router();

tradeRoutes.post("/", protectRoute, trade);
// TODO add a route for backtesting trades
export { tradeRoutes };
