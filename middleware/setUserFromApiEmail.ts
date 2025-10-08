import { Response, NextFunction } from "express";
import { internalApi } from "../shared/internalApi.client";
import { AuthenticatedRequest } from "types/auth";

export async function setUserFromApiEmail(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  const email = req.headers["x-api-email"] as string | undefined;
  if (email) {
    try {
      const authServerUrl =
        process.env.AUTH_SERVER_URL || "http://localhost:4000";
      let user: any;
      try {
        const resp = await internalApi.get(
          `${authServerUrl}/api/internal/user-by-email/${encodeURIComponent(email)}`
        );
        if (resp.data && resp.data.user) {
          user = resp.data.user;
        }
      } catch (err) {
        console.error("Error fetching user from internal API:", err);
      }

      if (user) {
        req.user = user;
      }
    } catch (err) {
      console.error("Error setting req.user from X-API-Email:", err);
    }
  }
  next();
}
