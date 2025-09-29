import { Request, Response, NextFunction } from "express";
import { ErrorHandling } from "../middleware/errorHandler";
import { authClient } from "@/authService.client";

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

interface JWTPayload {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
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
      // Or from cookies
      token = req.cookies.token;
    }

    if (!token) {
      return next(new ErrorHandling("Not authorized, no token", 401));
    }

    const validation = await authClient.validateToken(token);

    if (!validation.valid || !validation.user) {
      return next(new ErrorHandling(validation.error || "Not authorized, invalid token", 401));
    }

    // Attach user to request
    req.user = validation.user;

    next();
  } catch (err: any) {
    console.error('Auth middleware error:', err);
    return next(new ErrorHandling("Not authorized", 401));
  }
};