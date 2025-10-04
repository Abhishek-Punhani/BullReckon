import { Router } from "express";

import { protectRoute } from "../../../middleware/authMiddleware";
import { portfolioController } from "../controllers/portfolio.controller";

const portfolioRoutes: Router = Router();

portfolioRoutes.get("/:userId", protectRoute, portfolioController.getPortfolio);
portfolioRoutes.get(
  "/:userId/performance",
  protectRoute,
  portfolioController.getPortfolioPerformance
);
portfolioRoutes.get(
  "/:userId/recent-trades",
  protectRoute,
  portfolioController.getRecentTrades
);
portfolioRoutes.get(
  "/:userId/dashboard",
  protectRoute,
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
  portfolioController.getPositions
);
portfolioRoutes.get(
  "/:userId/holding/:symbol",
  protectRoute,
  portfolioController.getHoldingForSymbol
);

export default portfolioRoutes;
