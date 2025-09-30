import { BaseApp } from "../../shared/baseApp";
import { DatabaseManager } from "../../shared/dbManager";
import { calcConfig } from "./config";
import portfolioRoutes from "./routes/portfolio.routes";
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
app.addRoutes("/api/portfolio", portfolioRoutes);
app.initializeErrorHandling();

app.start(db, calcConfig.PORT);

process.on("SIGTERM", () => app.shutdown(db));
process.on("SIGINT", () => app.shutdown(db));
