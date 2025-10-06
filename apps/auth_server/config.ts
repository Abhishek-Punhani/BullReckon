import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
dotenv.config({ path: ".env" });
export const authConfig = {
  NODE_ENV:
    (process.env.NODE_ENV as "development" | "production" | "test") ||
    "development",
  PORT: Number(process.env.PORT) || 3001,
  DB_URL: process.env.DB_URL || "",
  SESSION_SECRET: process.env.SESSION_SECRET || "",
  CLIENT_URL: process.env.CLIENT_URL || "",
};

export const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  process.env.CALC_SERVER_URL || "http://localhost:8000",
  process.env.MARKET_SERVER_URL || "http://localhost:5000",
  process.env.API_SERVER_URL || "http://localhost:3004",
  process.env.AUTH_SERVER_URL || "http://localhost:4000",
];
