import { BaseApp } from "../../shared/baseApp";
import { DatabaseManager } from "../../shared/dbManager";
import { apiConfig, allowedOrigins } from "./apiConfig";
import apiRoutes from "./routes/api.routes.";

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
  customCors: {
    origin: allowedOrigins,
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  },
});

// Setup routes
app.addRoutes("/api", apiRoutes);

app.initializeErrorHandling();

app.start(db, apiConfig.PORT);

process.on("SIGTERM", () => app.shutdown(db));
process.on("SIGINT", () => app.shutdown(db));
