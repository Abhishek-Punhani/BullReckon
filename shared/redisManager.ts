import IORedis from "ioredis";

/**
 * Redis Manager - Centralized Redis Connection Management
 *
 * Provides a singleton Redis connection instance across all services.
 * Similar to DatabaseManager for MongoDB, this ensures all Redis operations
 * (queues, caching, etc.) use the same connection pool.
 *
 * Features:
 * - Singleton pattern for connection reuse
 * - Auto-reconnection on failures
 * - Event logging for debugging
 * - Environment-based configuration
 *
 * Usage:
 * const redis = RedisManager.getInstance();
 * await redis.connect();
 * const value = await redis.get('key');
 */

export class RedisManager {
  private static instance: RedisManager;
  private connection?: IORedis | null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private isDisabled: boolean = false;

  private constructor() {
    // Check if Redis is disabled
    this.isDisabled = process.env.DISABLE_REDIS_QUEUES === "true";

    if (this.isDisabled) {
      console.log("⚠️  Redis is disabled via DISABLE_REDIS_QUEUES=true");
      this.connection = null;
      return;
    }
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  public async connect(): Promise<void> {
    if (this.isDisabled) {
      console.log("⚠️  Redis is disabled, skipping connection");
      return;
    }

    // If already connected, skip
    if (this.connection && this.isConnected) {
      console.log("📦 Using existing Redis connection");
      return;
    }

    // If currently connecting, wait for it to finish
    if (this.isConnecting) {
      console.log("⏳ Redis connection in progress, waiting...");
      // Wait for connection to complete
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isConnecting) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      return;
    }

    this.isConnecting = true;

    try {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null, // Required for BullMQ blocking operations
        enableAutoPipelining: true,
        lazyConnect: false,
        retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
        },
        reconnectOnError: (err) => {
        // Ignore SETINFO errors (compatibility issue with older Redis)
        if (err.message.includes("SETINFO")) {
          return false;
        }
        console.log("🔄 Redis reconnecting due to error:", err.message);
        return true;
        },
      });
    } else {
      this.connection = new IORedis({
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null, // Required for BullMQ blocking operations
        enableAutoPipelining: true,
        lazyConnect: false,
        retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
        },
        reconnectOnError: (err) => {
        // Ignore SETINFO errors (compatibility issue with older Redis)
        if (err.message.includes("SETINFO")) {
          return false;
        }
        console.log("🔄 Redis reconnecting due to error:", err.message);
        return true;
        },
      });
    }

      this.setupEventHandlers();

      // IORedis connects automatically by default, no need to call connect()
      // Wait for ready event
      await new Promise<void>((resolve, reject) => {
        this.connection!.once("ready", () => {
          this.isConnected = true;
          this.isConnecting = false;
          resolve();
        });
        this.connection!.once("error", (err) => {
          // Ignore SETINFO errors
          if (err.message.includes("SETINFO")) {
            return;
          }
          this.isConnecting = false;
          reject(err);
        });
      });

      console.log("✅ Redis connected successfully");
    } catch (error) {
      console.error("❌ Redis connection failed:", error);
      this.connection = null;
      this.isConnected = false;
      this.isConnecting = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.quit();
      this.isConnected = false;
      console.log("📦 Redis disconnected");
    }
  }

  public getConnection(): IORedis | null {
    return this.connection || null;
  }

  public isReady(): boolean {
    return this.isConnected && this.connection !== null && !this.isDisabled;
  }

  public async healthCheck(): Promise<boolean> {
    if (this.isDisabled || !this.connection) {
      return false;
    }

    try {
      await this.connection.ping();
      return true;
    } catch (error) {
      console.error("❌ Redis health check failed:", error);
      return false;
    }
  }

  private setupEventHandlers(): void {
    if (!this.connection) {
      return;
    }

    this.connection.on("connect", () => {
      console.log("✅ Redis connected");
    });

    this.connection.on("ready", () => {
      console.log("✅ Redis ready");
      this.isConnected = true;
    });

    this.connection.on("error", (err: any) => {
      // Ignore SETINFO errors (compatibility issue with older Redis versions)
      if (err.message.includes("SETINFO")) {
        return;
      }
      console.error("❌ Redis error:", err.message);
    });

    this.connection.on("close", () => {
      console.log("📦 Redis connection closed");
      this.isConnected = false;
    });

    this.connection.on("reconnecting", () => {
      console.log("🔄 Redis reconnecting...");
    });

    this.connection.on("end", () => {
      console.log("📦 Redis connection ended");
      this.isConnected = false;
    });
  }
}

export default RedisManager;
