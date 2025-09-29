import { BaseApp } from "../../shared/baseApp";
import { DatabaseManager } from "../../shared/dbManager";
import { calcConfig } from "./config";
import { riskRoutes } from "./routes/risk_settings.routes";
import { tradeRoutes } from "./routes/trades.routes";

// Initialize database
const db = DatabaseManager.getInstance(calcConfig);

// Initialize app with calc-specific configuration
const app = new BaseApp({
  serviceName: "BullReckon Calc Service",
  config: calcConfig,
  enableSockets: true,
  enableQueues: true,
  enableFileUpload: true,
  enableSessions: false,
});

// Setup routes
app.addRoutes("/api/trades", tradeRoutes);
app.addRoutes("/api/risk-settings", riskRoutes);
app.initializeErrorHandling();
// Start the service
async function start() {
  try {
    await db.connect();
    await app.listen(calcConfig.PORT);
    console.log("🧮 Calc Service started successfully");
  } catch (error) {
    console.error("💥 Failed to start Calc Service:", error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdownHandler() {
  console.log("🛑 Shutting down Calc Service...");
  if (app.queueManager) {
    await app.queueManager.shutdown();
  }
  await app.close();
  await db.disconnect();
  process.exit(0);
}

start();

process.on("SIGTERM", shutdownHandler);
process.on("SIGINT", shutdownHandler);
