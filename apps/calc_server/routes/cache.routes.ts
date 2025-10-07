import { Router } from "express";
import { protectRoute } from "../../../middleware/authMiddleware";
import { cacheController } from "../controllers/cache.controller";

const cacheRoutes: Router = Router();

// Cache management routes (protected)
cacheRoutes.get("/stats", protectRoute, cacheController.getStats);
cacheRoutes.delete("/", protectRoute, cacheController.clearAll);
cacheRoutes.delete(
  "/pattern/:pattern",
  protectRoute,
  cacheController.clearPattern
);

export { cacheRoutes };
