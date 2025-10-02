import { Router } from "express";
import { protectRoute } from "middleware/authMiddleware";
import { apiKeyController } from "../contollers/api.controller";

const apiRoutes : Router=Router();


// POST /api/keys/generate
apiRoutes.post('/generate', protectRoute, apiKeyController.generateApiKey);

// GET /api/keys
apiRoutes.get('/', protectRoute, apiKeyController.getUserApiKeys);

// DELETE /api/keys/:keyId
apiRoutes.delete('/:keyId', protectRoute, apiKeyController.revokeApiKey);

export default apiRoutes;