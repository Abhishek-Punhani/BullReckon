import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../packages/models/user";
import { ErrorHandling } from "../middleware/errorHandler";

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

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET_ACCESS!
    ) as JWTPayload;

    // Find user
    const user = await User.findById(decoded.id)
      .select("firstName lastName email role isEmailVerified")
      .lean<{
        _id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: "user" | "admin" | "trader" | "premium";
        isEmailVerified: boolean;
      }>();

    if (!user) {
      return next(new ErrorHandling("Not authorized, user not found", 401));
    }

    // Attach user to request
    req.user = {
      _id: decoded.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };

    next();
  } catch (err: any) {
    if (err.name === "JsonWebTokenError") {
      return next(new ErrorHandling("Not authorized, invalid token", 401));
    } else if (err.name === "TokenExpiredError") {
      return next(new ErrorHandling("Not authorized, token expired", 401));
    }
    return next(new ErrorHandling("Not authorized", 401));
  }
};
