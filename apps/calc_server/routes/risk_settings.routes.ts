import { Router } from "express";
import { protectRoute } from '../../../middleware/authMiddleware';
import { riskController } from "../controllers/risk_settings.contoller";

const router = Router();

router.use(protectRoute);

router.get("/settings", riskController.getRiskSettings);
router.post("/settings", riskController.updateRiskSettings);

router.get("/metrics", riskController.getRiskMetrics);
router.get("/positions", riskController.getPositionRisks);

router.post("/calculate-position-size", riskController.calculatePositionSize);

router.post("/preset/:preset", riskController.applyRiskPreset);

router.post("/monitor-positions", riskController.monitorPositions);

export { router as riskRoutes };
