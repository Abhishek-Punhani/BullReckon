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
      console.warn("Auth service unavailable, fallback disabled");
      return { valid: false, error: "Auth service unavailable" };
    }
  }
}

export const authClient = AuthClient.getInstance();
