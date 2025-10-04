import { Request, Response, NextFunction } from "express";
import { ErrorHandling } from "./errorHandler.js";
import { authClient } from "../shared/authService.client.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: "user" | "admin" | "trader" | "premium";
        isEmailVerified: boolean;
      };
    }
  }
}

// Protect route middleware
export const protectRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    // Get token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new ErrorHandling("Not authorized, no token", 401));
    }

    // Validate token
    const validation = await authClient.validateToken(token);

    if (!validation.valid) {
      // Return specific error message from validation
      const errorMsg = validation.error || "Invalid token";
      return next(new ErrorHandling(errorMsg, 401));
    }

    if (!validation.user) {
      return next(new ErrorHandling("Invalid token", 401));
    }

    // Attach user to request
    req.user = validation.user;
    next();
  } catch (err: any) {
    console.error("❌ Auth middleware error:", err);
    return next(new ErrorHandling("Not authorized, invalid token", 401));
  }
};
