import { BaseApp } from "../../shared/baseApp";
import { DatabaseManager } from "../../shared/dbManager";
import { apiConfig, allowedOrigins } from "./apiConfig";
import apiRoutes from "./routes/api.routes.";
import cors from "cors";

// Initialize database
const db = DatabaseManager.getInstance(apiConfig);

// Initialize app with api-specific configuration
const app = new BaseApp({
  serviceName: "BullReckon API Service",
  config: apiConfig,
  enableSockets: false,
  enableQueues: false,
  enableFileUpload: false,
  enableSessions: false,
  disableCors: true,
  // NOTE: global CORS intentionally removed so we can apply route-level CORS
});
export const corsForCookies = {
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-api-key",
    "x-api-signature",
    "x-api-timestamp",
    "x-api-email",
  ],
};

export const corsForApiKeys = {
  origin: "*", // can be widened if you want but keep credentials:false for API key flows
  credentials: false,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "x-api-key",
    "x-api-signature",
    "x-api-timestamp",
    "x-api-email",
    "Authorization",
  ],
};

// Apply route-level CORS middleware on the underlying Express app before mounting routes
// Keys routes use cookie/JWT flows and require credentials
app.app.use("/api/keys", cors(corsForCookies));
app.app.options("/api/keys", cors(corsForCookies));

// API-key header routes: allow any origin (no credentials)
app.app.use("/api/market", cors(corsForApiKeys));
app.app.options("/api/market", cors(corsForApiKeys));
app.app.use("/api/trade", cors(corsForApiKeys));
app.app.options("/api/trade", cors(corsForApiKeys));
app.app.use("/api/backtest", cors(corsForApiKeys));
app.app.options("/api/backtest", cors(corsForApiKeys));
app.app.use("/api/trades", cors(corsForApiKeys));
app.app.options("/api/trades", cors(corsForApiKeys));

// Setup routes
app.addRoutes("/api", apiRoutes);

app.initializeErrorHandling();

app.start(db, apiConfig.PORT);

process.on("SIGTERM", () => app.shutdown(db));
process.on("SIGINT", () => app.shutdown(db));
