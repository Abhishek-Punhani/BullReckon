import axios from "axios";
import { API_CONFIG } from "../lib/config";

export const authService = {
  async login(email: string, password: string) {
    try {
      const response = await axios.post(
        `${API_CONFIG.AUTH_SERVER}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      const result = response.data;

      // Store auth data
      if (typeof window !== "undefined" && result.accessToken) {
        localStorage.setItem("access_token", result.accessToken);
        localStorage.setItem("user", JSON.stringify(result.user));
      }

      return result;
    } catch (error: any) {
      throw new Error(error?.response?.data || "Login failed");
    }
  },

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    photoUrl?: string
  ) {
    try {
      const response = await axios.post(
        `${API_CONFIG.AUTH_SERVER}/api/auth/register`,
        {
          firstName,
          lastName,
          email,
          password,
          photo: photoUrl,
        },
        { withCredentials: true }
      );
      const result = response.data;

      // Store auth data
      if (typeof window !== "undefined" && result.accessToken) {
        localStorage.setItem("access_token", result.accessToken);
        localStorage.setItem("user", JSON.stringify(result.user));
      }

      return result;
    } catch (error: any) {
      throw new Error(error?.response?.data || "Registration failed");
    }
  },

  async logout() {
    try {
      await axios.post(
        `${API_CONFIG.AUTH_SERVER}/api/auth/logout`,
        {},
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${this.getToken()}`,
          },
        }
      );
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Clear stored data
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }
  },

  async validateToken(token: string) {
    const response = await axios.get(
      `${API_CONFIG.AUTH_SERVER}/api/auth/validate`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  async refreshToken() {
    try {
      const response = await axios.post(
        `${API_CONFIG.AUTH_SERVER}/api/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const result = response.data;
      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", result.accessToken);
      }
      return result;
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
    return null;
  },

  getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token");
    }
    return null;
  },

  getUser() {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch (error) {
          console.error("Failed to parse user from localStorage:", error);
        }
      }
    }
    return null;
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  async googleLogin(credentialResponse: { credential: string }) {
    try {
      const response = await axios.post(
        `${API_CONFIG.AUTH_SERVER}/api/auth/google-login`,
        { credential: credentialResponse.credential },
        { withCredentials: true }
      );
      const result = response.data;

      if (typeof window !== "undefined" && result.accessToken) {
        localStorage.setItem("access_token", result.accessToken);
        localStorage.setItem("user", JSON.stringify(result.user));
      }

      return {
        isNewUser: result.isNewUser || !result.user?.isEmailVerified,
        user: result.user,
      };
    } catch (error: any) {
      const message =
        error?.response?.data ||
        (error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : "Google Login failed, Please try again");
      throw new Error(message);
    }
  },
};