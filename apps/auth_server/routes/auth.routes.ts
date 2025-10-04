import { Router } from "express";
import { protectRoute } from "../../../middleware/authMiddleware";
import {
  changePassword,
  googleAuth,
  loginUser,
  logoutUser,
  refreshToken,
  registerUser,
  requestActivationEmail,
  requestPasswordEmail,
  updateUserProfile,
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
authRoutes.post("/change-password", changePassword);
authRoutes.post("/verify-email", verifyEmail);
authRoutes.post("/google-login", googleAuth);
authRoutes.post("/user/update",protectRoute,updateUserProfile);


export { authRoutes };
