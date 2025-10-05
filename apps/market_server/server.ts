import { BaseApp } from "../../shared/baseApp";
import { DatabaseManager } from "../../shared/dbManager";
import { marketConfig, allowedOrigins } from "./config";
import { marketRoutes } from "./routes/market.routes";

// Initialize database
const db = DatabaseManager.getInstance(marketConfig);

// Initialize app with market-specific configuration
const app = new BaseApp({
  serviceName: "BullReckon Market Service",
  config: marketConfig,
  enableSessions: false, // Market service doesn't need sessions
  enableFileUpload: false, // Market service doesn't need file uploads
  customRateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: marketConfig.RATE_LIMIT_REQUESTS, // Configurable request limit
  },
  customCors: {
    origin: allowedOrigins,
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  },
});

// Setup routes
app.addRoutes("/api/market", marketRoutes);

// Initialize error handling
app.initializeErrorHandling();

app.start(db, marketConfig.PORT);

process.on("SIGTERM", () => app.shutdown(db));
process.on("SIGINT", () => app.shutdown(db));
