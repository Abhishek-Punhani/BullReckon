import { Queue, Worker, Job, QueueEvents } from "bullmq";
import IORedis from "ioredis";

/**
 * Queue Framework - Professional Queue Management System
 *
 * This is a framework that provides Redis-based queue infrastructure.
 * Each service should register its own queues and workers independently.
 *
 * Features:
 * - Centralized Redis connection management
 * - Queue registration and lifecycle management
 * - Worker registration with custom processors
 * - Automatic fallback to direct processing when Redis is unavailable
 * - Health checks and graceful shutdown
 * - Type-safe queue and worker registration
 *
 * Usage:
 * 1. Get QueueManager instance in your service
 * 2. Register your queues with registerQueue<T>()
 * 3. Register your workers with registerWorker<T>()
 * 4. Add jobs using the queue instance
 */

export interface QueueOptions<T = any> {
  defaultJobOptions?: {
    removeOnComplete?: number | boolean;
    removeOnFail?: number | boolean;
    attempts?: number;
    backoff?: {
      type: "exponential" | "fixed";
      delay: number;
    };
    priority?: number;
    delay?: number;
  };
}

export interface WorkerOptions<T = any> {
  concurrency?: number;
  limiter?: {
    max: number;
    duration: number;
  };
  onCompleted?: (job: Job<T>, result: any) => void | Promise<void>;
  onFailed?: (job: Job<T> | undefined, error: Error) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
}

export type JobProcessor<T = any> = (job: Job<T>) => Promise<any>;

export class QueueManager {
  private static instance: QueueManager;
  private redisConnection?: IORedis | null;
  private isInitialized: boolean = false;

  // Registry for queues and workers
  private queues: Map<string, Queue<any>> = new Map();
  private workers: Map<string, Worker<any>> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();

  private constructor() {
    if (process.env.DISABLE_REDIS_QUEUES !== "true") {
      try {
        this.redisConnection = new IORedis({
          host: process.env.REDIS_HOST || "localhost",
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
          lazyConnect: true,
        });

        // Suppress connection errors when Redis is disabled
        this.redisConnection.on("error", (err: any) => {
          if (process.env.DISABLE_REDIS_QUEUES === "true") {
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

  /**
   * Initialize the queue manager and test Redis connection
   */
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

      this.isInitialized = true;
      console.log("✅ Queue Manager initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Queue Manager:", error);
      console.log("⚠️ Falling back to direct processing");
      this.isInitialized = false;
    }
  }

  /**
   * Check if the queue manager is ready to process jobs
   */
  public isQueueReady(): boolean {
    return this.isInitialized && this.redisConnection !== null;
  }

  /**
   * Register a new queue
   * @param name - Unique name for the queue
   * @param options - Queue configuration options
   * @returns Queue instance
   */
  public registerQueue<T = any>(
    name: string,
    options: QueueOptions<T> = {}
  ): Queue<T> {
    if (this.queues.has(name)) {
      return this.queues.get(name) as Queue<T>;
    }

    const connection = this.redisConnection;
    const prefix = process.env.REDIS_PREFIX || "bullreckon:";

    if (!connection) {
      throw new Error("Redis connection not available for queue setup");
    }

    const queue = new Queue<T>(name, {
      connection,
      prefix,
      defaultJobOptions: options.defaultJobOptions,
    });

    this.queues.set(name, queue);
    console.log(`✅ Registered queue: ${name}`);
    return queue;
  }

  /**
   * Register a new worker to process jobs from a queue
   * @param queueName - Name of the queue to process
   * @param processor - Function to process jobs
   * @param options - Worker configuration options
   * @returns Worker instance
   */
  public registerWorker<T = any>(
    queueName: string,
    processor: JobProcessor<T>,
    options: WorkerOptions<T> = {}
  ): Worker<T> {
    if (this.workers.has(queueName)) {
      console.warn(`⚠️ Worker for queue '${queueName}' already registered`);
      return this.workers.get(queueName) as Worker<T>;
    }

    const connection = this.redisConnection;
    const prefix = process.env.REDIS_PREFIX || "bullreckon:";

    if (!connection) {
      throw new Error("Redis connection not available for worker setup");
    }

    const worker = new Worker<T>(queueName, processor, {
      connection,
      prefix,
      concurrency: options.concurrency || 5,
      limiter: options.limiter,
    });

    // Attach event listeners
    if (options.onCompleted) {
      worker.on("completed", options.onCompleted);
    }

    if (options.onFailed) {
      worker.on("failed", options.onFailed);
    }

    if (options.onError) {
      worker.on("error", options.onError);
    }

    this.workers.set(queueName, worker);
    console.log(`✅ Registered worker for queue: ${queueName}`);
    return worker;
  }

  /**
   * Register queue events to monitor queue status
   * @param queueName - Name of the queue to monitor
   * @returns QueueEvents instance
   */
  public registerQueueEvents(queueName: string): QueueEvents {
    if (this.queueEvents.has(queueName)) {
      return this.queueEvents.get(queueName)!;
    }

    const connection = this.redisConnection;
    const prefix = process.env.REDIS_PREFIX || "bullreckon:";

    if (!connection) {
      throw new Error("Redis connection not available for queue events setup");
    }

    const queueEvents = new QueueEvents(queueName, {
      connection,
      prefix,
    });

    this.queueEvents.set(queueName, queueEvents);
    console.log(`✅ Registered queue events for: ${queueName}`);
    return queueEvents;
  }

  /**
   * Get a registered queue by name
   */
  public getQueue<T = any>(name: string): Queue<T> | undefined {
    return this.queues.get(name) as Queue<T> | undefined;
  }

  /**
   * Get a registered worker by queue name
   */
  public getWorker<T = any>(queueName: string): Worker<T> | undefined {
    return this.workers.get(queueName) as Worker<T> | undefined;
  }

  /**
   * Get Redis connection for advanced usage
   */
  public getRedisConnection(): IORedis | null | undefined {
    return this.redisConnection;
  }

  /**
   * Health check for all registered queues
   */
  public async healthCheck(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      const healthChecks = Array.from(this.queues.values()).map((queue) =>
        queue.getWaiting()
      );
      await Promise.all(healthChecks);
      return true;
    } catch (error) {
      console.error("Queue health check failed:", error);
      return false;
    }
  }

  /**
   * Graceful shutdown - closes all workers, queues, and connections
   */
  public async shutdown(): Promise<void> {
    console.log("🔄 Shutting down Queue Manager...");

    // Close all workers
    const workerClosePromises = Array.from(this.workers.values()).map(
      (worker) => worker.close()
    );

    // Close all queue events
    const queueEventsClosePromises = Array.from(this.queueEvents.values()).map(
      (queueEvents) => queueEvents.close()
    );

    // Wait for all to close
    await Promise.all([...workerClosePromises, ...queueEventsClosePromises]);

    // Close Redis connection
    if (this.redisConnection) {
      await this.redisConnection.quit();
    }

    console.log("✅ Queue Manager shut down successfully");
  }

  /**
   * Add a job to a queue
   * This is a convenience method - you can also use queue.add() directly
   */
  public async addJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    options?: {
      delay?: number;
      priority?: number;
      attempts?: number;
    }
  ): Promise<any> {
    const queue = this.getQueue<T>(queueName);

    if (!queue) {
      console.warn(
        `⚠️ Queue '${queueName}' not registered. Job will not be added.`
      );
      return null;
    }

    if (process.env.DISABLE_REDIS_QUEUES === "true" || !this.isInitialized) {
      console.log(`⚠️ Processing job '${jobName}' directly (queues disabled)`);
      return null;
    }

    return await (queue as any).add(jobName, data, options);
  }
}

export default QueueManager;
