import { BaseApp } from "../../shared/baseApp";
import { DatabaseManager } from "../../shared/dbManager";
import { QueueManager } from "../../shared/queueManager";
import { codeConfig, allowedOrigins } from "./config";
import codeExecutionRoutes from "./routes/codeExecutionRoutes";
import { setupCodeQueues } from "./queue.setup";
import {
  verifyDockerAvailability,
  prepullDockerImages,
} from "./services/codeExecutionService";

// Initialize database
const db = DatabaseManager.getInstance(codeConfig);

// Initialize queue manager
const queueManager = QueueManager.getInstance();

// Initialize app with code-specific configuration
const app = new BaseApp({
  serviceName: "BullReckon Code Execution Service",
  config: codeConfig,
  enableSockets: false,
  enableQueues: true,
  enableFileUpload: false,
  enableSessions: false,
  customCors: {
    origin: allowedOrigins,
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

// Setup routes
app.addRoutes("/api", codeExecutionRoutes);
app.initializeErrorHandling();

// Start server
async function startServer() {
  try {
    // Verify Docker is available
    const dockerAvailable = await verifyDockerAvailability();
    if (!dockerAvailable) {
      console.error(
        "❌ Docker is not available. Please install Docker to run code execution service."
      );
      process.exit(1);
    }

    // Start the server
    await app.start(db, codeConfig.PORT);

    // Initialize code execution queues and workers
    if (app.queueManager) {
      console.log("🔧 Setting up code execution queues and workers...");
      await setupCodeQueues(app.queueManager);
    } else {
      console.warn(
        "⚠️  Queue manager not available - code execution will run in fallback mode"
      );
    }

    // Pre-pull Docker images for better performance (optional, can be slow)
    if (process.env.PREPULL_DOCKER_IMAGES === "true") {
      await prepullDockerImages();
    } else {
      console.log(
        "ℹ️  Skipping Docker image pre-pull. Set PREPULL_DOCKER_IMAGES=true to enable."
      );
    }

    console.log("🚀 Code Execution Service is running");
    console.log(`📡 API available at: http://localhost:${codeConfig.PORT}`);
  } catch (error) {
    console.error("❌ Failed to start code execution service:", error);
    process.exit(1);
  }
}

startServer().catch(console.error);
