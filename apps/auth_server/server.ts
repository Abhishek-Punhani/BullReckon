import { BaseApp } from "../../shared/baseApp";
import { DatabaseManager } from "../../shared/dbManager";
import { QueueManager } from "../../shared/queueManager";
import { authConfig } from "./config";
import { authRoutes } from "./routes/auth.routes";
import { internalRoutes } from "./routes/internal.routes";
import { setupAuthQueues } from "./queue.setup";

// Initialize database
const db = DatabaseManager.getInstance(authConfig);

// Initialize queue manager
const queueManager = QueueManager.getInstance();

// Initialize app with auth-specific configuration
const app = new BaseApp({
  serviceName: "BullReckon Auth Service",
  config: authConfig,
  enableSessions: true,
  enableFileUpload: true,
  enableQueues: true,
  customRateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Stricter for auth service
  },
});

// Setup routes
app.addRoutes("/api/auth", authRoutes);
app.addRoutes("/api/internal", internalRoutes);
app.initializeErrorHandling();

// Start server and initialize auth-specific queues
async function startServer() {
  await app.start(db, authConfig.PORT);

  // Initialize auth server queues and workers
  if (app.queueManager) {
    await setupAuthQueues(app.queueManager);
  }
}

startServer();

process.on("SIGTERM", () => app.shutdown(db));
process.on("SIGINT", () => app.shutdown(db));
