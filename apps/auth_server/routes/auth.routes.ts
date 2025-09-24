import { Router } from "express";
import { protectRoute } from "../../../middleware/authMiddleware";
import {
  loginUser,
  logoutUser,
  refreshToken,
  registerUser,
  requestActivationEmail,
  requestPasswordEmail,
} from "../controllers/auth.controllers";

const authRoutes = Router();

authRoutes.post("/register", registerUser);
authRoutes.post("/login", loginUser);
authRoutes.post("/refresh-token", refreshToken);
authRoutes.post("/logout", protectRoute, logoutUser);
authRoutes.post("/refresh-token", refreshToken);
authRoutes.post("/request-password-mail", requestPasswordEmail);
authRoutes.post("/request-activation-mail", requestActivationEmail);
authRoutes.post("/change-password", requestPasswordEmail);

export { authRoutes };
