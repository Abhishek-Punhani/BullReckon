import { Queue, Worker, Job, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { processPendingOrder } from "../apps/calc_server/workers/pendingOrders";
import {
  processEmailJob,
  EmailJobData,
} from "../apps/auth_server/workers/emailWorker";

declare global {
  var queueManager:
    | {
        addPendingOrderJob: (params: {
          tradeId: string;
          userId: string;
          symbol: string;
          action: string;
          quantity: number;
          orderType: string;
          limitPrice?: number;
          stopPrice?: number;
          triggerPrice: number;
        }) => void;
        addEmailJob: (data: EmailJobData) => Promise<void>;
      }
    | undefined;
}

export interface PendingOrderJobData {
  tradeId: string;
  userId: string;
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  orderType: "limit" | "stop_loss" | "take_profit";
  limitPrice?: number;
  stopPrice?: number;
  triggerPrice: number;
}

export type { EmailJobData };

export class QueueManager {
  private static instance: QueueManager;
  private redisConnection?: IORedis | null;
  private isInitialized: boolean = false;

  // Queue instances
  private pendingOrdersQueue!: Queue<PendingOrderJobData>;
  private notificationQueue!: Queue;
  private emailQueue!: Queue;

  // Worker instances
  private pendingOrdersWorker!: Worker<PendingOrderJobData>;
  private notificationWorker!: Worker;
  private emailWorker!: Worker;

  // Queue events
  private pendingOrdersQueueEvents!: QueueEvents;

  private customQueues: Record<string, Queue<any>> = {};

  private constructor() {
    if (process.env.DISABLE_REDIS_QUEUES !== "true") {
      try {
        this.redisConnection = new IORedis({
          host: process.env.REDIS_HOST || "localhost",
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
          lazyConnect: true, // Don't connect immediately
        });

        // Suppress connection errors when Redis is disabled
        this.redisConnection.on("error", (err: any) => {
          if (process.env.DISABLE_REDIS_QUEUES === "true") {
            // Silently ignore errors when Redis is disabled
            return;
          }
          console.error("Redis connection error:", err);
        });
      } catch (error) {
        console.log("⚠️ Redis connection failed - running in fallback mode");
        this.redisConnection = null;
      }
    } else {
      console.log("⚠️ Redis queues disabled - running in fallback mode");
      this.redisConnection = null;
    }
  }

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  public async initialize(): Promise<void> {
    try {
      if (process.env.DISABLE_REDIS_QUEUES === "true") {
        console.log("⚠️ Redis queues disabled - running in fallback mode");
        this.isInitialized = true;
        return;
      }

      // Test Redis connection
      if (this.redisConnection) {
        let retries = 0;
        const maxRetries = 5;

        while (retries < maxRetries) {
          try {
            await this.redisConnection.ping();
            console.log("✅ Connected to Redis");
            break;
          } catch (error) {
            retries++;
            if (retries < maxRetries) {
              console.log(
                `⏳ Waiting for Redis connection (attempt ${retries}/${maxRetries})...`
              );
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } else {
              throw error;
            }
          }
        }
      }

      await this.setupQueues();
      await this.setupWorkers();
      await this.setupQueueEvents();
      this.isInitialized = true;
      console.log("✅ Queue Manager initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Queue Manager:", error);
      console.log("⚠️ Falling back to direct processing");
      this.isInitialized = false;
      // Don't throw error - allow app to continue without queues
    }
  }

  public isQueueReady(): boolean {
    return this.isInitialized;
  }

  private async setupQueues(): Promise<void> {
    const connection = this.redisConnection;

    if (!connection) {
      throw new Error("Redis connection not available for queue setup");
    }

    const queuePrefix = process.env.REDIS_PREFIX || "bullreckon:";

    // Pending orders queue
    this.pendingOrdersQueue = new Queue<PendingOrderJobData>("pending-orders", {
      connection,
      prefix: queuePrefix,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });

    // Email queue with retry configuration
    this.emailQueue = new Queue<EmailJobData>("emails", {
      connection,
      prefix: queuePrefix,
      defaultJobOptions: {
        removeOnComplete: 200, // Keep more completed email jobs
        removeOnFail: 100, // Keep failed email jobs for debugging
        attempts: 5, // Retry up to 5 times for emails
        backoff: {
          type: "exponential",
          delay: 3000, // Start with 3 second delay
        },
      },
    });

    // Notification queue
    this.notificationQueue = new Queue("notifications", {
      connection,
      prefix: queuePrefix,
    });
  }

  private async setupWorkers(): Promise<void> {
    const connection = this.redisConnection;

    if (!connection) {
      throw new Error("Redis connection not available for workers setup");
    }

    const queuePrefix = process.env.REDIS_PREFIX || "bullreckon:";

    this.pendingOrdersWorker = new Worker<PendingOrderJobData>(
      "pending-orders",
      processPendingOrder,
      {
        connection,
        prefix: queuePrefix,
        concurrency: parseInt(
          process.env.PENDING_ORDER_WORKER_CONCURRENCY || "5"
        ),
        limiter: {
          max: 50,
          duration: 60000,
        },
      }
    );

    // Email worker with higher concurrency for faster processing
    this.emailWorker = new Worker<EmailJobData>("emails", processEmailJob, {
      connection,
      prefix: queuePrefix,
      concurrency: parseInt(process.env.EMAIL_WORKER_CONCURRENCY || "10"),
      limiter: {
        max: 30, // Max 30 emails per minute to avoid rate limits
        duration: 60000,
      },
    });

    // Email worker event listeners
    this.emailWorker.on("completed", (job) => {
      console.log(`✅ Email job ${job.id} completed successfully`);
    });

    this.emailWorker.on("failed", (job, err) => {
      console.error(`❌ Email job ${job?.id} failed:`, err.message);
    });

    this.emailWorker.on("error", (err) => {
      console.error("❌ Email worker error:", err);
    });
  }

  private async setupQueueEvents(): Promise<void> {
    const connection = this.redisConnection;

    if (!connection) {
      throw new Error("Redis connection not available for queue events setup");
    }

    const queuePrefix = process.env.REDIS_PREFIX || "bullreckon:";

    // Pending orders queue events
    this.pendingOrdersQueueEvents = new QueueEvents("pending-orders", {
      connection,
      prefix: queuePrefix,
    });

    this.pendingOrdersQueueEvents.on(
      "completed",
      async ({ jobId, returnvalue }) => {
        console.log(`✅ Pending order job ${jobId} completed:`, returnvalue);
      }
    );

    this.pendingOrdersQueueEvents.on(
      "failed",
      async ({ jobId, failedReason }) => {
        console.error(`❌ Pending order job ${jobId} failed:`, failedReason);
      }
    );

    this.pendingOrdersQueueEvents.on("stalled", (jobId) => {
      console.warn(`⚠️ Pending order job ${jobId} stalled`);
    });
  }

  // Public methods to add jobs
  public async addPendingOrderJob(
    data: PendingOrderJobData,
    options?: {
      delay?: number;
      priority?: number;
      attempts?: number;
    }
  ): Promise<Job<PendingOrderJobData> | null> {
    if (
      process.env.DISABLE_REDIS_QUEUES === "true" ||
      !this.isInitialized ||
      !this.pendingOrdersQueue
    ) {
      console.log("📊 Processing pending order directly (queues disabled)");
      await this.processPendingOrderDirectly(data);
      return null;
    }

    return await this.pendingOrdersQueue.add("process-pending-order", data, {
      priority: options?.priority || 5,
      delay: options?.delay,
      attempts: options?.attempts,
      ...options,
    });
  }

  public async addNotificationJob(data: any): Promise<Job | null> {
    if (!this.isInitialized || !this.notificationQueue) {
      console.log("📨 Processing notification directly (queues disabled)");
      // Process directly or skip
      return null;
    }

    return await this.notificationQueue.add("send-notification", data);
  }

  public async addEmailJob(
    data: EmailJobData,
    options?: {
      delay?: number;
      priority?: number;
      attempts?: number;
    }
  ): Promise<Job<EmailJobData> | null> {
    if (
      process.env.DISABLE_REDIS_QUEUES === "true" ||
      !this.isInitialized ||
      !this.emailQueue
    ) {
      console.log("📧 Processing email directly (queues disabled)");
      await this.processEmailDirectly(data);
      return null;
    }

    return await this.emailQueue.add("send-email", data, {
      priority: options?.priority || 5,
      delay: options?.delay,
      attempts: options?.attempts || 5,
      ...options,
    });
  }

  // Fallback processing when queues are disabled
  private async processPendingOrderDirectly(
    data: PendingOrderJobData
  ): Promise<void> {
    try {
      // Import the processor and run directly
      await processPendingOrder({ data } as Job<PendingOrderJobData>);
    } catch (error) {
      console.error("❌ Direct pending order processing failed:", error);
    }
  }

  private async processEmailDirectly(data: EmailJobData): Promise<void> {
    try {
      await processEmailJob({ data } as Job<EmailJobData>);
    } catch (error) {
      console.error("❌ Direct email processing failed:", error);
    }
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      await Promise.all([
        this.pendingOrdersQueue?.getWaiting(),
        this.notificationQueue?.getWaiting(),
      ]);
      return true;
    } catch (error) {
      console.error("Queue health check failed:", error);
      return false;
    }
  }

  // Graceful shutdown
  public async shutdown(): Promise<void> {
    console.log("🔄 Shutting down Queue Manager...");

    await Promise.all([
      this.pendingOrdersWorker?.close(),
      this.notificationWorker?.close(),
      this.emailWorker?.close(),
      this.pendingOrdersQueueEvents?.close(),
    ]);

    if (this.redisConnection) {
      await this.redisConnection.quit();
    }
    console.log("✅ Queue Manager shut down successfully");
  }

  public registerQueue<T = any>(
    name: string,
    options: {
      defaultJobOptions?: any;
      prefix?: string;
      connection?: any;
    } = {}
  ): Queue<T> {
    const connection = options.connection || this.redisConnection;
    const prefix = options.prefix || process.env.REDIS_PREFIX || "bullreckon:";

    if (!connection)
      throw new Error("Redis connection not available for queue setup");

    if (!this.customQueues[name]) {
      this.customQueues[name] = new Queue<T>(name, {
        connection,
        prefix,
        defaultJobOptions: options.defaultJobOptions,
      });
      console.log(`✅ Registered custom queue: ${name}`);
    }
    return this.customQueues[name] as Queue<T>;
  }

  public getQueue<T = any>(name: string): Queue<T> | undefined {
    return this.customQueues[name] as Queue<T> | undefined;
  }
}

export default QueueManager;
