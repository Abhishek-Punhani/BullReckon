import axios from "axios";
import { API_CONFIG } from "../lib/config";
import { authService } from "./authService";

export interface ApiKeyData {
  id: string;
  email: string;
  isActive: boolean;
  requestsUsed: number;
  lastUsedAt?: Date;
  expiresAt?: Date;
  rateLimit: {
    maxPerMinute: number;
    currentCount: number;
    windowStart: Date;
  };
  createdAt: Date;
}

export interface GeneratedApiKey {
  id: string;
  publicKey: string;
  expiresAt?: Date;
  createdAt: Date;
  warning: string;
}

export const apiKeyService = {
  /**
   * Generate a new API key pair
   */
  async generateApiKey(expiresInDays?: number): Promise<GeneratedApiKey> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await axios.post(
        `${API_CONFIG.API_SERVER}/api/keys/generate`,
        { expiresInDays },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data.data;
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to generate API key";
      throw new Error(message);
    }
  },

  /**
   * Get all API keys for the authenticated user
   */
  async getUserApiKeys(): Promise<ApiKeyData[]> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await axios.get(
        `${API_CONFIG.API_SERVER}/api/keys`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data.data.keys;
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch API keys";
      throw new Error(message);
    }
  },

  /**
   * Revoke an API key
   */
  async revokeApiKey(keyId: string): Promise<void> {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      await axios.delete(
        `${API_CONFIG.API_SERVER}/api/keys/${keyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to revoke API key";
      throw new Error(message);
    }
  },

  /**
   * Copy text to clipboard
   */
  copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      return new Promise((resolve, reject) => {
        try {
          document.execCommand("copy");
          textArea.remove();
          resolve();
        } catch (error) {
          textArea.remove();
          reject(error);
        }
      });
    }
  },
};
