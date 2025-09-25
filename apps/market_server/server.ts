import { BaseApp } from "../../shared/baseApp";
import { DatabaseManager } from "../../shared/dbManager";
import { marketConfig } from "./config";
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
    origin: marketConfig.CLIENT_URL,
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

// Start the service
async function start() {
  try {
    // Try to connect to database, but don't fail if it's unavailable
    try {
      await db.connect();
      console.log("✅ Database connected");
    } catch (dbError) {
      console.warn(
        "⚠️  Database connection failed - running in standalone mode"
      );
      console.warn(
        "   Market data features will work, but data won't be persisted"
      );
    }

    await app.listen(marketConfig.PORT);
    console.log("📈 Market Service started successfully");
    console.log(
      `🔗 Market API available at: http://localhost:${marketConfig.PORT}/api/market`
    );
    console.log("📋 Available endpoints:");
    console.log("  GET  /api/market/quote/:symbol - Get stock quote");
    console.log(
      "  GET  /api/market/historical/:symbol?period=1mo - Get historical data"
    );
    console.log("  POST /api/market/quotes - Get multiple quotes");
    console.log("  GET  /api/market/search?q=query - Search stocks");
    console.log("  GET  /api/market/stats - Service statistics");
    console.log("  DELETE /api/market/cache - Clear cache");
    console.log(`  GET  /health - Health check`);
  } catch (error) {
    console.error("💥 Failed to start Market Service:", error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdownHandler() {
  console.log("🛑 Shutting down Market Service...");
  await app.close();
  await db.disconnect();
  process.exit(0);
}

start();

process.on("SIGTERM", shutdownHandler);
process.on("SIGINT", shutdownHandler);
