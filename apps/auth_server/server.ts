import { BaseApp } from "../../shared/BaseApp";
import { DatabaseManager } from "../../shared/dbManager";
import { authConfig } from "./config";


class AuthService {
  private app: BaseApp;
  private db: DatabaseManager;

  constructor() {
    // Initialize database
    this.db = DatabaseManager.getInstance(authConfig);
    
    // Initialize app with auth-specific configuration
    this.app = new BaseApp({
      serviceName: 'BullReckon Auth Service',
      config: authConfig,
      enableSockets: true,
      enableSessions: true,
      enableFileUpload: true,
      customRateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 50, // Stricter for auth service
      },
    });

    this.setupRoutes();
  }

  private setupRoutes(): void {
  }



  public async start(): Promise<void> {
    try {
      await this.db.connect();
      await this.app.listen(authConfig.PORT);
      console.log('🔐 Auth Service started successfully');
    } catch (error) {
      console.error('💥 Failed to start Auth Service:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    await this.app.close();
    await this.db.disconnect();
  }
}

// Start the service
const authService = new AuthService();
authService.start();

// Graceful shutdown
const shutdownHandler = async () => {
  console.log('🛑 Shutting down Auth Service...');
  await authService.stop();
  process.exit(0);
};

process.on('SIGTERM', shutdownHandler);
process.on('SIGINT', shutdownHandler);