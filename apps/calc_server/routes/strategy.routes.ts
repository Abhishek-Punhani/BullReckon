import { Router } from "express";
import { protectRoute } from "../../../middleware/authMiddleware";
import { internalAuth } from "../../../middleware/internalAuthMiddleware";
import { strategyController } from "../controllers/strategy.controller";

const strategyRoutes: Router = Router();

// User strategy routes (JWT protected)
strategyRoutes.post("/", protectRoute, strategyController.createStrategy);
strategyRoutes.get("/", protectRoute, strategyController.getUserStrategies);
strategyRoutes.get(
  "/active",
  protectRoute,
  strategyController.getActiveStrategies
);
strategyRoutes.get("/:id", protectRoute, strategyController.getStrategy);
strategyRoutes.put("/:id", protectRoute, strategyController.updateStrategy);
strategyRoutes.delete("/:id", protectRoute, strategyController.deleteStrategy);
strategyRoutes.patch(
  "/:id/status",
  protectRoute,
  strategyController.updateStrategyStatus
);
strategyRoutes.get(
  "/:id/logs",
  protectRoute,
  strategyController.getExecutionLogs
);
strategyRoutes.get(
  "/:id/metrics",
  protectRoute,
  strategyController.getStrategyMetrics
);
strategyRoutes.post(
  "/:id/execute",
  protectRoute,
  strategyController.executeStrategy
);

// Internal routes (for strategy execution engine)
strategyRoutes.get(
  "/internal/active",
  internalAuth,
  strategyController.getActiveStrategies
);

export default strategyRoutes;
