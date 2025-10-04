import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
export function internalAuth(req: Request, res: Response, next: NextFunction) {
  const serviceSecret = req.headers["x-service-secret"];
  const isInternal = req.headers["x-internal-service"];

  if (!isInternal || serviceSecret !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({ error: "Internal access only" });
  }
  next();
}
