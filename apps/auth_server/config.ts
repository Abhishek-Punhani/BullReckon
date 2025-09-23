import dotenv from "dotenv";
dotenv.config();

export const authConfig = {
  NODE_ENV:
    (process.env.NODE_ENV as "development" | "production" | "test") ||
    "development",
  PORT: Number(process.env.PORT) || 3001,
  DB_URL: process.env.DB_URL || "",
  SESSION_SECRET: process.env.SESSION_SECRET || "",
  CLIENT_URL: process.env.CLIENT_URL || "",
};
