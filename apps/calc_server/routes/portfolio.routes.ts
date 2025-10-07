import { Router } from "express";

import { protectRoute } from "../../../middleware/authMiddleware";
import { portfolioController } from "../controllers/portfolio.controller";
import { portfolioCache } from "../../../middleware/cacheMiddleware";

const portfolioRoutes: Router = Router();

portfolioRoutes.get(
  "/:userId",
  protectRoute,
  portfolioCache,
  portfolioController.getPortfolio
);
portfolioRoutes.get(
  "/:userId/performance",
  protectRoute,
  portfolioCache,
  portfolioController.getPortfolioPerformance
);
portfolioRoutes.get(
  "/:userId/recent-trades",
  protectRoute,
  portfolioCache,
  portfolioController.getRecentTrades
);
portfolioRoutes.get(
  "/:userId/dashboard",
  protectRoute,
  portfolioCache,
  portfolioController.getDashboardData
);
portfolioRoutes.post(
  "/:userId/positions",
  protectRoute,
  portfolioController.updatePosition
);
portfolioRoutes.get(
  "/:userId/positions",
  protectRoute,
  portfolioCache,
  portfolioController.getPositions
);
portfolioRoutes.get(
  "/:userId/holding/:symbol",
  protectRoute,
  portfolioCache,
  portfolioController.getHoldingForSymbol
);

export default portfolioRoutes;
