import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
export function internalAuth(req: Request, res: Response, next: NextFunction) {
  // In market server's internalAuthMiddleware
  console.log("Received header secret:", req.headers["x-service-secret"]);
  console.log("Expected secret:", process.env.INTERNAL_SERVICE_SECRET);
  const serviceSecret = req.headers["x-service-secret"];
  const isInternal = req.headers["x-internal-service"];

  if (!isInternal || serviceSecret !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({ error: "Internal access only" });
  }
  next();
}
