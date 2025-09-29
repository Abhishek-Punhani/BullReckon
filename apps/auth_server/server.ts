import { protectRoute } from "middleware/authMiddleware";
import { BaseApp } from "../../shared/baseApp";
import { DatabaseManager } from "../../shared/dbManager";
import { authConfig } from "./config";
import { authRoutes } from "./routes/auth.routes";
import { internalRoutes } from "./routes/internal.routes";

// Initialize database
const db = DatabaseManager.getInstance(authConfig);

// Initialize app with auth-specific configuration
const app = new BaseApp({
  serviceName: "BullReckon Auth Service",
  config: authConfig,
  enableSessions: true,
  enableFileUpload: true,
  customRateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Stricter for auth service
  },
});

// Setup routes
app.addRoutes("/api/auth", authRoutes);
app.addRoutes("/api/internal", internalRoutes);
app.initializeErrorHandling();
// Start the service
async function start() {
  try {
    await db.connect();
    await app.listen(authConfig.PORT);
    console.log("🔐 Auth Service started successfully");
  } catch (error) {
    console.error("💥 Failed to start Auth Service:", error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdownHandler() {
  console.log("🛑 Shutting down Auth Service...");
  await app.close();
  await db.disconnect();
  process.exit(0);
}

start();

process.on("SIGTERM", shutdownHandler);
process.on("SIGINT", shutdownHandler);
