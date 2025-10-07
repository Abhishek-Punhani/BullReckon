import { Router } from "express";
import { protectRoute } from "../../../middleware/authMiddleware";
import { riskController } from "../controllers/risk_settings.contoller";
import { historyCache } from "../../../middleware/cacheMiddleware";

const router: Router = Router();

router.use(protectRoute);

router.get("/", historyCache, riskController.getRiskSettings);
router.post("/", riskController.updateRiskSettings);

router.get("/metrics", historyCache, riskController.getRiskMetrics);
router.get("/positions", historyCache, riskController.getPositionRisks);

router.post("/calculate-position-size", riskController.calculatePositionSize);

router.post("/preset/:preset", riskController.applyRiskPreset);

router.post("/monitor-positions", riskController.monitorPositions);

router.get("/dashboard", historyCache, riskController.getRiskDashboard);
router.post("/manual-check", riskController.triggerManualRiskCheck);
router.get("/history", historyCache, riskController.getRiskHistory);
router.get(
  "/monitoring-status",
  historyCache,
  riskController.getMonitoringStatus
);
router.post("/toggle", riskController.toggleRiskMonitoring);

export { router as riskRoutes };
