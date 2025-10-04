import { Router } from "express";
import { apiKeyController } from "../contollers/api.controller";
import { protectRoute } from '../../../middleware/authMiddleware';

const apiRoutes: Router = Router();

// POST /api/keys/generate
apiRoutes.post("/generate", protectRoute, apiKeyController.generateApiKey);

// GET /api/keys
apiRoutes.get("/", protectRoute, apiKeyController.getUserApiKeys);

// DELETE /api/keys/:keyId
apiRoutes.delete("/:keyId", protectRoute, apiKeyController.revokeApiKey);

export default apiRoutes;
