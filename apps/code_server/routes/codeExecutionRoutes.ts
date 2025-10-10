import express, { Router } from "express";
import {
  executeCode,
  getExecutionStatus,
} from "../controllers/codeExecutionController";
import { protectRoute } from "../../../middleware/authMiddleware";

const router: Router = express.Router();

// Route for submitting code execution jobs (protected)
router.post("/execute", protectRoute, executeCode);

// Route for checking job status (optional, for async tracking)
router.get("/status/:jobId", protectRoute, getExecutionStatus);

export default router;
