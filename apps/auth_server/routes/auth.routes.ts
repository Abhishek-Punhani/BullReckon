import { Router } from "express";
import { protectRoute } from "../../../middleware/authMiddleware";
import {
  googleAuth,
  loginUser,
  logoutUser,
  refreshToken,
  registerUser,
  requestActivationEmail,
  requestPasswordEmail,
  verifyEmail,
} from "../controllers/auth.controllers";

const authRoutes: Router = Router();

authRoutes.post("/register", registerUser);
authRoutes.post("/login", loginUser);
authRoutes.post("/refresh-token", refreshToken);
authRoutes.post("/logout", protectRoute, logoutUser);
authRoutes.post("/refresh-token", refreshToken);
authRoutes.post("/request-password-mail", requestPasswordEmail);
authRoutes.post("/request-activation-mail", requestActivationEmail);
authRoutes.post("/change-password", requestPasswordEmail);
authRoutes.post("/verify-email/:token", verifyEmail);
authRoutes.post("/google-login", googleAuth);


export { authRoutes };
