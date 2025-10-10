import { API_CONFIG } from "@/config";
import api from "@/lib/api";

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

export const codeExecutionService = {
  async executeCode(
    language: string,
    code: string
  ): Promise<{ jobId: string }> {
    try {
      const response = await api.post(`${API_CONFIG.CODE_SERVER}/api/execute`, {
        language,
        code,
      });
      return response.data;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message =
        apiError?.response?.data?.error ||
        apiError?.message ||
        "Failed to execute code";
      throw new Error(message);
    }
  },

  async getExecutionStatus(
    jobId: string
  ): Promise<{ status: string; output?: string }> {
    try {
      const response = await api.get(
        `${API_CONFIG.CODE_SERVER}/api/status/${jobId}`
      );
      return response.data;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const message =
        apiError?.response?.data?.error ||
        apiError?.message ||
        "Failed to get execution status";
      throw new Error(message);
    }
  },
};
