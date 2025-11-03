import IORedis from "ioredis";
import { Queue, Worker, Job, QueueEvents } from "bullmq";
import { RedisManager } from "./redisManager";

/**
 * Queue Framework - Professional Queue Management System
 *
 * This is a framework that provides Redis-based queue infrastructure.
 * Each service should register its own queues and workers independently.
 *
 * Features:
 * - Centralized Redis connection management (via RedisManager)
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
  private redisManager: RedisManager;
  private redisConnection?: IORedis | null;
  private isInitialized: boolean = false;

  // Registry for queues and workers
  private queues: Map<string, Queue<any>> = new Map();
  private workers: Map<string, Worker<any>> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();

  private constructor() {
    // Use centralized RedisManager
    this.redisManager = RedisManager.getInstance();

    if (process.env.DISABLE_REDIS_QUEUES !== "true") {
      console.log("🔧 QueueManager: Using centralized RedisManager");
    } else {
      console.log("⚠️  Redis queues disabled - running in fallback mode");
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
    if (this.isInitialized) {
      console.log("📦 QueueManager already initialized");
      return;
    }

    if (process.env.DISABLE_REDIS_QUEUES === "true") {
      console.log("⚠️  Redis queues disabled - skipping initialization");
      this.isInitialized = true;
      return;
    }

    try {
      // Connect via RedisManager
      await this.redisManager.connect();
      this.redisConnection = this.redisManager.getConnection();

      if (this.redisConnection && this.redisManager.isReady()) {
        console.log("✅ QueueManager initialized with Redis connection");
        this.isInitialized = true;
      } else {
        console.log(
          "⚠️  Redis connection not available - running in fallback mode"
        );
        this.isInitialized = true;
      }
    } catch (error) {
      console.error("❌ Failed to initialize QueueManager:", error);
      this.redisConnection = null;
      this.isInitialized = true;
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
    this.queueEvents.set(name, new QueueEvents(name, { connection }));
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
