import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
dotenv.config({ path: ".env" });
export const marketConfig = {
  NODE_ENV:
    (process.env.NODE_ENV as "development" | "production" | "test") ||
    "development",
  PORT: Number(process.env.MARKET_SERVER_PORT) || 3002,
  DB_URL: process.env.DB_URL || "",
  SESSION_SECRET: process.env.SESSION_SECRET || "",
  CLIENT_URL: process.env.CLIENT_URL || "",
  CACHE_DURATION: Number(process.env.CACHE_DURATION) || 60, // seconds
  RATE_LIMIT_REQUESTS: Number(process.env.RATE_LIMIT_REQUESTS) || 200, // requests per window
};
