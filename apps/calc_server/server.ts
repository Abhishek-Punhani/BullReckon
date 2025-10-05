import { BaseApp } from "../../shared/baseApp";
import { DatabaseManager } from "../../shared/dbManager";
import { QueueManager } from "../../shared/queueManager";
import { calcConfig } from "./config";
import portfolioRoutes from "./routes/portfolio.routes";
import { riskRoutes } from "./routes/risk_settings.routes";
import { tradeRoutes } from "./routes/trades.routes";
import { setupCalcQueues } from "./queue.setup";
import { allowedOrigins } from "./config";
import scriptTradeRoutes from "./routes/scriptTrade.routes";

// Initialize database
const db = DatabaseManager.getInstance(calcConfig);

// Initialize queue manager
const queueManager = QueueManager.getInstance();

// Initialize app with calc-specific configuration
const app = new BaseApp({
  serviceName: "BullReckon Calc Service",
  config: calcConfig,
  enableSockets: true,
  enableQueues: true,
  enableFileUpload: true,
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
app.addRoutes("/api/trades", tradeRoutes);
app.addRoutes("/api/risk-settings", riskRoutes);
app.addRoutes("/api/portfolio", portfolioRoutes);
app.addRoutes("/api/script-trades", scriptTradeRoutes);
app.initializeErrorHandling();

// Start server and initialize calc-specific queues
async function startServer() {
  await app.start(db, calcConfig.PORT);

  // Initialize calc server queues and workers
  if (app.queueManager) {
    await setupCalcQueues(app.queueManager);
  }
}

startServer();

process.on("SIGTERM", () => app.shutdown(db));
process.on("SIGINT", () => app.shutdown(db));
