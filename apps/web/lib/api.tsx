import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { authService } from "../services/authService";

// Type definitions
interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: AxiosError) => void;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_AUTH_SERVER || "http://localhost:4000",
  withCredentials: true,
});

let isRefreshing: boolean = false;
let failedQueue: QueueItem[] = [];

// Helper to process queued requests
const processQueue = (
  error: AxiosError | null,
  token: string | null = null
): void => {
  failedQueue.forEach((prom: QueueItem) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Helper for logout
const handleLogout = async (): Promise<void> => {
  try {
    await authService.logout();
  } catch (error) {
    console.error("Logout failed:", error);
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }
    window.location.href = "/auth/login";
  }
};

// Add request interceptor to include token in headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = authService.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (
    error: AxiosError
  ): Promise<AxiosResponse | AxiosError> => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Extract the error message correctly
    const errorMessage =
      (error.response?.data &&
        typeof error.response.data === "object" &&
        "error" in error.response.data &&
        (error.response.data as { error?: { message?: string } }).error?.message) ||
      error.message ||
      "Unknown error";

    // Handle 401 (Unauthorized) - Token expired or invalid
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      console.log("🔍 Detected 401 error:", errorMessage);

      if (
        String(errorMessage).includes("Invalid token") ||
        String(errorMessage).includes("Not authorized") ||
        String(errorMessage).includes("Token")
      ) {
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers["Authorization"] = `Bearer ${token}`;
              }
              return api(originalRequest);
            })
            .catch((err: AxiosError) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          console.log("🔄 Attempting to refresh token...");

          const result = await authService.refreshToken();
          const newAccessToken = result.accessToken;

          if (!newAccessToken) {
            throw new Error("No access token received");
          }

          console.log("✅ Token refreshed successfully");

          // Update axios default headers
          if (api.defaults.headers.common) {
            api.defaults.headers.common["Authorization"] =
              `Bearer ${newAccessToken}`;
          }

          // Retry original request with new token
          processQueue(null, newAccessToken);
          isRefreshing = false;

          if (originalRequest.headers) {
            originalRequest.headers["Authorization"] =
              `Bearer ${newAccessToken}`;
          }
          return api(originalRequest);
        } catch (refreshError: any) {
          console.error("❌ Token refresh failed:", refreshError);

          processQueue(error, null);
          isRefreshing = false;

          const refreshErrorMessage =
            refreshError.response?.data?.error?.message ||
            refreshError.message ||
            "Refresh token failed";

          if (
            refreshErrorMessage.includes("Refresh token") ||
            refreshErrorMessage.includes("Invalid or expired") ||
            refreshErrorMessage.includes("User not found")
          ) {
            console.log("🚪 Session expired, logging out...");
            await handleLogout();
          }

          return Promise.reject(refreshError);
        }
      }
    }

    // Handle 403 (Forbidden) - Account inactive or suspended
    if (error.response?.status === 403) {
      const errorData = error.response.data as { error?: { message?: string } };
      const errorMessage = errorData?.error?.message || "";

      if (
        errorMessage.includes("Account is not active") ||
        errorMessage.includes("suspended")
      ) {
        console.error("❌ Account is suspended or inactive");
        await handleLogout();
      }
    }

    return Promise.reject(error);
  }
);

export default api;