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

export { router as riskRoutes };
