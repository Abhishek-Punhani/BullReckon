import { Router } from "express";
import { protectRoute } from "../../../middleware/authMiddleware";
import { riskController } from "../controllers/risk_settings.contoller";

const router: Router = Router();

router.use(protectRoute);

router.get("/", riskController.getRiskSettings);
router.post("/", riskController.updateRiskSettings);

router.get("/metrics", riskController.getRiskMetrics);
router.get("/positions", riskController.getPositionRisks);

router.post("/calculate-position-size", riskController.calculatePositionSize);

router.post("/preset/:preset", riskController.applyRiskPreset);

router.post("/monitor-positions", riskController.monitorPositions);

router.get("/dashboard", riskController.getRiskDashboard);
router.post("/manual-check", riskController.triggerManualRiskCheck);
router.get("/history", riskController.getRiskHistory);
router.get("/monitoring-status", riskController.getMonitoringStatus);
router.post("/toggle", riskController.toggleRiskMonitoring);

export { router as riskRoutes };
