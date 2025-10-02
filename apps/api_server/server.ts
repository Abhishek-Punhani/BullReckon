import { BaseApp } from "@/baseApp";
import { DatabaseManager } from "@/dbManager";
import { apiConfig } from "./apiConfig";

// Initialize database
const db = DatabaseManager.getInstance(apiConfig);

// Initialize app with calc-specific configuration
const app = new BaseApp({
  serviceName: "BullReckon Calc Service",
  config: apiConfig,
  enableSockets: false,
  enableQueues: false,
  enableFileUpload: true,
  enableSessions: false,
});

// Setup routes

app.initializeErrorHandling();

app.start(db, apiConfig.PORT);

process.on("SIGTERM", () => app.shutdown(db));
process.on("SIGINT", () => app.shutdown(db));
