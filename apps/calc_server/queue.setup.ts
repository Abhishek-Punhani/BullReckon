import { QueueManager } from "../../shared/queueManager";
import { processCalcEmailJob, CalcEmailJobData } from "./workers/emailWorker";
import { processPendingOrder } from "./workers/pendingOrders";
import {
  processStrategyExecutionJob,
  StrategyExecutionJobData,
} from "./workers/strategyWorker";
import { RiskManagementService } from "./services/riskManagement.service";
import { processRiskTrade } from "./workers/riskTradeWorker";
import { Job } from "bullmq";
import { Queue } from "bullmq";
import { RiskSettings } from "./models/risk_settings";

/**
 * Calc Server Queue Setup
 *
 * This module initializes queues and workers specific to the calc server.
 * Each service is responsible for registering its own queues and workers.
 */

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
  scriptName?: string;
  confidence?: number;
  reason?: string;
}

let emailQueue: Queue<CalcEmailJobData> | undefined;
let pendingOrdersQueue: Queue<PendingOrderJobData> | undefined;
let strategyExecutionQueue: Queue<StrategyExecutionJobData> | undefined;

export async function setupCalcQueues(
  queueManager: QueueManager
): Promise<void> {
  if (!queueManager.isQueueReady()) {
    console.log(
      "⚠️ Queue system not ready - calc queues will not be initialized"
    );
    return;
  }

  try {
    // Register calc email queue
    emailQueue = queueManager.registerQueue<CalcEmailJobData>("calc-emails", {
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
      },
    });

    // Register calc email worker
    queueManager.registerWorker<CalcEmailJobData>(
      "calc-emails",
      processCalcEmailJob,
      {
        concurrency: 10,
        limiter: {
          max: 30, // 30 emails per minute
          duration: 60000,
        },
        onCompleted: (job, result) => {
          console.log(`✅ [Calc] Email job ${job.id} completed:`, result);
        },
        onFailed: (job, error) => {
          console.error(
            `❌ [Calc] Email job ${job?.id} failed:`,
            error.message
          );
        },
        onError: (error) => {
          console.error("❌ [Calc] Email worker error:", error);
        },
      }
    );

    // Register pending orders queue
    pendingOrdersQueue = queueManager.registerQueue<PendingOrderJobData>(
      "pending-orders",
      {
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: false, // Keep failed jobs for monitoring
          attempts: Number.MAX_SAFE_INTEGER, // Retry indefinitely until conditions are met
          backoff: {
            type: "fixed",
            delay: 30000, // Check every 30 seconds
          },
        },
      }
    );

    // Register pending orders worker
    queueManager.registerWorker<PendingOrderJobData>(
      "pending-orders",
      processPendingOrder,
      {
        concurrency: 10, // Increased concurrency for monitoring multiple orders
        limiter: {
          max: 100,
          duration: 60000,
        },
        onCompleted: (job, result) => {
          console.log(
            `✅ [Calc] Pending order job ${job.id} completed:`,
            result
          );
        },
        onFailed: (job, error) => {
          // Don't log errors for "conditions not met" (expected behavior)
          if (error?.message !== "ORDER_CONDITIONS_NOT_MET") {
            console.error(
              `❌ [Calc] Pending order job ${job?.id} failed:`,
              error.message
            );
          }
        },
        onError: (error) => {
          console.error("❌ [Calc] Pending orders worker error:", error);
        },
      }
    );

    // Register strategy execution queue
    strategyExecutionQueue =
      queueManager.registerQueue<StrategyExecutionJobData>(
        "strategy-execution",
        {
          defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 20,
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 5000,
            },
          },
        }
      );

    // Register strategy execution worker
    queueManager.registerWorker<StrategyExecutionJobData>(
      "strategy-execution",
      processStrategyExecutionJob,
      {
        concurrency: 5, // Process up to 5 strategies concurrently
        limiter: {
          max: 50, // 50 strategy executions per minute
          duration: 60000,
        },
        onCompleted: (job, result) => {
          console.log(
            `✅ [Calc] Strategy execution job ${job.id} completed:`,
            `${result.executionsPerformed} executions in ${result.processingTime}ms`
          );
        },
        onFailed: (job, error) => {
          console.error(
            `❌ [Calc] Strategy execution job ${job?.id} failed:`,
            error.message
          );
        },
        onError: (error) => {
          console.error("❌ [Calc] Strategy execution worker error:", error);
        },
      }
    );

    // Register risk settings monitoring queue
    const riskMonitorQueue = queueManager.registerQueue<{ userId: string }>(
      "risk-settings-monitor",
      {
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 20,
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
        },
      }
    );

    // Register risk settings monitoring worker with proper error handling
    queueManager.registerWorker<{ userId: string }>(
      "risk-settings-monitor",
      async (job: Job<{ userId: string }>) => {
        const { userId } = job.data;
        try {
          console.log(`[Risk] Monitoring positions for user ${userId}`);
          const riskService = new RiskManagementService();
          await riskService.monitorPositions(userId);
          return { success: true, userId, timestamp: new Date() };
        } catch (error: any) {
          console.error(`[Risk] Error monitoring user ${userId}:`, error);
          throw error; // Let BullMQ handle retry
        }
      },
      {
        concurrency: 5,
        limiter: {
          max: 100, // Max 100 monitoring checks per minute
          duration: 60000,
        },
      }
    );

    // Register risk trade execution worker
    queueManager.registerWorker<any>("trade-execution", processRiskTrade, {
      concurrency: 10,
      limiter: {
        max: 50,
        duration: 60000,
      },
      onCompleted: (job, result) => {
        console.log(
          `✅ [Risk] Trade execution job ${job.id} completed:`,
          result
        );
      },
      onFailed: (job, error) => {
        console.error(
          `❌ [Risk] Trade execution job ${job?.id} failed:`,
          error.message
        );
      },
    });

    // Register portfolio snapshot worker (runs every hour for all active users)
    queueManager.registerWorker<{ userId: string }>(
      "portfolio-snapshot",
      async (job: Job<{ userId: string }>) => {
        const { userId } = job.data;
        const riskService = new RiskManagementService();
        await riskService.updatePortfolioSnapshot(userId);
        console.log(
          `📸 [Snapshot] Created portfolio snapshot for user ${userId}`
        );
      },
      { concurrency: 3 }
    );

    // Register queue events for monitoring
    const emailQueueEvents = queueManager.registerQueueEvents("calc-emails");
    const pendingOrdersQueueEvents =
      queueManager.registerQueueEvents("pending-orders");
    const strategyExecutionQueueEvents =
      queueManager.registerQueueEvents("strategy-execution");

    emailQueueEvents.on("completed", ({ jobId }) => {
      console.log(`✅ [Calc] Email job ${jobId} completed successfully`);
    });

    pendingOrdersQueueEvents.on("completed", ({ jobId }) => {
      console.log(
        `✅ [Calc] Pending order job ${jobId} completed successfully`
      );
    });

    strategyExecutionQueueEvents.on("completed", ({ jobId }) => {
      console.log(
        `✅ [Calc] Strategy execution job ${jobId} completed successfully`
      );
    });

    console.log("✅ Calc server queues initialized successfully");

    // Initialize risk monitoring for all users with auto settings enabled
    await initializeRiskMonitoring(queueManager);
  } catch (error) {
    console.error("❌ Failed to setup calc queues:", error);
  }
}

/**
 * Add a trade confirmation email job to the queue
 */
export async function addCalcEmailJob(
  data: CalcEmailJobData,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
  }
): Promise<void> {
  if (!emailQueue) {
    console.warn("⚠️ Email queue not initialized - processing directly");
    await processCalcEmailJob({ data } as any);
    return;
  }

  await emailQueue.add("send-email", data, {
    priority: options?.priority || 5,
    delay: options?.delay,
    attempts: options?.attempts || 5,
    ...options,
  });
}
/**
 * Add a pending order job to the queue
 */
export async function addPendingOrderJob(
  data: PendingOrderJobData,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
  }
): Promise<void> {
  if (!pendingOrdersQueue) {
    console.warn(
      "⚠️ Pending orders queue not initialized - processing directly"
    );
    await processPendingOrder({ data } as any);
    return;
  }

  await pendingOrdersQueue.add("process-pending-order", data, {
    priority: options?.priority || 5,
    delay: options?.delay,
    attempts: options?.attempts || 3,
    ...options,
  });
}

/**
 * Add a strategy execution job to the queue
 */
export async function addStrategyExecutionJob(
  data: StrategyExecutionJobData,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
  }
): Promise<void> {
  if (!strategyExecutionQueue) {
    console.warn(
      "⚠️ Strategy execution queue not initialized - processing directly"
    );
    await processStrategyExecutionJob({ data } as any);
    return;
  }

  await strategyExecutionQueue.add("execute-strategy", data, {
    priority: options?.priority || 5,
    delay: options?.delay,
    attempts: options?.attempts || 3,
    ...options,
  });
}

export { emailQueue, pendingOrdersQueue, strategyExecutionQueue };

/**
 * Initialize risk monitoring for all users with enabled settings
 * This runs on server startup to resume monitoring for existing users
 */
async function initializeRiskMonitoring(
  queueManager: QueueManager
): Promise<void> {
  try {
    console.log("🔄 Initializing risk monitoring for existing users...");

    // Debug: Check all risk settings first
    const allSettings = await RiskSettings.find({});
    console.log(`📊 Total risk settings in DB: ${allSettings.length}`);

    if (allSettings.length > 0) {
      console.log(
        "Sample risk setting:",
        JSON.stringify(allSettings[0], null, 2)
      );
    }

    // Find all users with risk monitoring enabled and auto features turned on
    const activeRiskSettings = await RiskSettings.find({
      $and: [
        { $or: [{ enabled: { $ne: false } }, { enabled: { $exists: false } }] }, // enabled is true or doesn't exist (backward compatibility)
        {
          $or: [{ autoStopLossEnabled: true }, { autoTakeProfitEnabled: true }],
        },
      ],
    });

    console.log(
      `📊 Found ${activeRiskSettings.length} users with active risk monitoring (with auto features enabled)`
    );

    const riskMonitorQueue = queueManager.getQueue("risk-settings-monitor");
    if (!riskMonitorQueue) {
      console.warn("⚠️ Risk monitor queue not available");
      return;
    }

    // Schedule monitoring for each user
    for (const settings of activeRiskSettings) {
      const jobId = `risk-monitor-${settings.userId}`;

      try {
        // Remove any existing job first
        await riskMonitorQueue.removeRepeatable("monitor-risk-settings", {
          jobId,
          every: 30000,
        });
      } catch (error) {
        // Ignore if job doesn't exist
      }

      // Schedule recurring monitoring every 30 seconds
      await riskMonitorQueue.add(
        "monitor-risk-settings",
        { userId: settings.userId },
        {
          jobId,
          repeat: {
            every: 30000 * 20, // 10 min
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      console.log(`✅ Initialized risk monitoring for user ${settings.userId}`);

      // Wait 2 minutes before scheduling the next user to avoid market server overload
      await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 1000));
    }

    console.log(
      `✅ Risk monitoring initialized for ${activeRiskSettings.length} users`
    );
  } catch (error) {
    console.error("❌ Failed to initialize risk monitoring:", error);
  }
}
