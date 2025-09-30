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

app.start(db, authConfig.PORT);

process.on("SIGTERM", () => app.shutdown(db));
process.on("SIGINT", () => app.shutdown(db));
