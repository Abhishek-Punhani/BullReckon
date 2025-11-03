import axios from "axios";

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
    // Use internal URL for Docker network, fallback to localhost for dev
    this.authServiceUrl =
      process.env.AUTH_SERVER_URL ||
      "http://localhost:4000";
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
      if (!token || token.trim() === "") {
        return { valid: false, error: "Token is empty" };
      }

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

      if (response.data && response.data.user) {
        return { valid: true, user: response.data.user };
      }

      return { valid: false, error: "Invalid token response" };
    } catch (error: any) {
      if (error.response?.status === 401) {
        const errorMsg = error.response?.data?.message || "Invalid token";
        return { valid: false, error: errorMsg };
      }

      if (error.code === "ECONNREFUSED") {
        console.warn("⚠️ Auth service unavailable");
        return { valid: false, error: "Auth service unavailable" };
      }

      console.error("❌ Token validation error:", error.message);
      return { valid: false, error: "Token validation failed" };
    }
  }
}

export const authClient = AuthClient.getInstance();
