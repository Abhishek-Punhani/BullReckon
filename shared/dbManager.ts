import * as mongoose from "mongoose";
import { BaseConfig } from "../types/config";

export class DatabaseManager {
  private static instance: DatabaseManager;
  private connection?: typeof mongoose;
  private config: BaseConfig;

  private constructor(config: BaseConfig) {
    this.config = config;
  }

  public static getInstance(config: BaseConfig): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager(config);
    }
    return DatabaseManager.instance;
  }

  public async connect(): Promise<void> {
    if (this.connection?.connection.readyState === 1) {
      console.log("📦 Using existing database connection");
      return;
    }

    try {
      this.connection = await mongoose.connect(this.config.DB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      } as mongoose.ConnectOptions);

      console.log("✅ Database connected successfully");

      // Enable debug mode in development
      if (this.config.NODE_ENV === "development") {
        mongoose.set("debug", true);
      }

      this.setupEventHandlers();
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await mongoose.disconnect();
      console.log("📦 Database disconnected");
    }
  }

  private setupEventHandlers(): void {
    if (!mongoose.connection) {
      console.error(
        "❌ mongoose.connection is undefined, cannot set up event handlers."
      );
      return;
    }

    mongoose.connection.on("error", (err: any) => {
      console.error("❌ Database error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("📦 Database disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ Database reconnected");
    });
  }
}
