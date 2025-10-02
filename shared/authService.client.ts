import { User } from "apps/calc_server/models";
import axios from "axios";
import jwt from "jsonwebtoken";

export interface AuthUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "user" | "admin" | "trader" | "premium";
  isEmailVerified: boolean;
}

class AuthClient {
  private static instance: AuthClient;
  private authServiceUrl: string;

  private constructor() {
    this.authServiceUrl =
      process.env.AUTH_SERVER_URL || "http://localhost:4000";
  }

  public static getInstance(): AuthClient {
    if (!AuthClient.instance) {
      AuthClient.instance = new AuthClient();
    }
    return AuthClient.instance;
  }

  async validateToken(
    token: string
  ): Promise<{ valid: boolean; user?: AuthUser; error?: string }> {
    try {
      const response = await axios.post(
        `${this.authServiceUrl}/api/internal/validate-token`,
        { token },
        {
          headers: {
            "X-Internal-Service": "true",
            "X-Service-Secret":
              process.env.INTERNAL_SERVICE_SECRET || "bullreckon-secret",
          },
          timeout: 5000,
        }
      );

      return { valid: true, user: response.data.user };
    } catch (error: any) {
      if (error.response?.status === 401) {
        return { valid: false, error: "Invalid token" };
      }

      // Fallback to original logic if auth service is down
      console.warn("Auth service unavailable, using fallback");
      return this.fallbackValidation(token);
    }
  }

  private async fallbackValidation(
    token: string
  ): Promise<{ valid: boolean; user?: AuthUser; error?: string }> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_ACCESS!) as any;
      const user = await User.findById(decoded.id)
        .select("firstName lastName email role isEmailVerified")
        .lean();

      if (!user) {
        return { valid: false, error: "User not found" };
      }

      return {
        valid: true,
        user: {
          _id: decoded.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified ?? false,
        },
      };
    } catch (error) {
      return { valid: false, error: "Token validation failed" };
    }
  }
}

export const authClient = AuthClient.getInstance();
