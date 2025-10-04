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

interface ErrorResponse {
  status: string;
  message: string;
  error?: string;
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_AUTH_SERVER || "http://localhost:4000",
  withCredentials: true,
});

let isRefreshing: boolean = false;
let failedQueue: QueueItem[] = [];

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

const handleLogout = async (): Promise<void> => {
  try {
    await authService.logout();
  } catch (error) {
    console.error("Logout failed:", error);
  } finally {
    // Always cleanup, even if logout fails
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }
    window.location.href = "/auth/signin";
  }
};

// Add request interceptor to include token from localStorage
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

api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (
    error: AxiosError<ErrorResponse>
  ): Promise<AxiosResponse | AxiosError> => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 (Unauthorized) - Token expired or invalid
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      console.log(error)
      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || "";

      // Check if this is a token validation error
      const isTokenError =
        errorMessage.includes("Invalid token") ||
        errorMessage.includes("Not authorized, invalid token") ||
        errorMessage.includes("Not authorized, no token") ||
        errorMessage.includes("Token") ||
        errorMessage === "Not authorized";

      if (isTokenError) {
        // If already refreshing, queue this request
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

          // Try to refresh the token
          const result = await authService.refreshToken();

          if (!result || !result.accessToken) {
            console.log("❌ No access token received from refresh");
            throw new Error("No access token received");
          }

          console.log("✅ Token refreshed successfully");
          const newAccessToken = result.accessToken;

          // Update axios default headers
          if (api.defaults.headers.common) {
            api.defaults.headers.common["Authorization"] =
              `Bearer ${newAccessToken}`;
          }

          // Process queued requests with new token
          processQueue(null, newAccessToken);
          isRefreshing = false;

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers["Authorization"] =
              `Bearer ${newAccessToken}`;
          }
          return api(originalRequest);
        } catch (refreshError: any) {
          console.error("❌ Token refresh failed:", refreshError);

          processQueue(error, null);
          isRefreshing = false;

          // Check if refresh failed due to invalid/expired refresh token
          const refreshErrorMsg =
            refreshError?.response?.data?.message ||
            refreshError?.response?.data?.error ||
            refreshError?.message ||
            "";

          const shouldLogout =
            refreshErrorMsg.includes("Refresh token") ||
            refreshErrorMsg.includes("Invalid or expired") ||
            refreshErrorMsg.includes("User not found") ||
            refreshErrorMsg.includes("logged out") ||
            refreshError?.response?.status === 401;

          if (shouldLogout) {
            console.log("🚪 Session expired, logging out...");
            await handleLogout();
          }

          return Promise.reject(refreshError);
        }
      }
    }

    // Handle 403 (Forbidden) - Account inactive or suspended
    if (error.response?.status === 403) {
      const errorData = error.response.data;
      const errorMessage = errorData?.message || "";

      if (
        errorMessage.includes("Account is not active") ||
        errorMessage.includes("suspended") ||
        errorMessage.includes("inactive")
      ) {
        console.error("Account is suspended or inactive");
        await handleLogout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
