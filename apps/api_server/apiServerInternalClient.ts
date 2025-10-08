import axios, { InternalAxiosRequestConfig } from "axios";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Utility for API server to call internal endpoints, always adds X-API-Email header if available
export const apiServerInternalClient = (email: string) => {
    const instance = axios.create({
        timeout: 5000,
        headers: {
            "X-Internal-Service": "true",
            "X-Service-Secret": process.env.INTERNAL_SERVICE_SECRET,
            "Content-Type": "application/json",
        },
    });

    if (email) {
        instance.interceptors.request.use((config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
            if (!config.headers) {
                config.headers = {} as any;
            }
            config.headers["X-API-Email"] = email;
            return config;
        });
    }

    return instance;
};
