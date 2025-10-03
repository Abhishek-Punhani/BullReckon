import { QueueManager } from "../../shared/queueManager";
import { processCalcEmailJob, CalcEmailJobData } from "./workers/emailWorker";
import { processPendingOrder } from "./workers/pendingOrders";
import { Queue } from "bullmq";

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
}

let emailQueue: Queue<CalcEmailJobData> | undefined;
let pendingOrdersQueue: Queue<PendingOrderJobData> | undefined;

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
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      }
    );

    // Register pending orders worker
    queueManager.registerWorker<PendingOrderJobData>(
      "pending-orders",
      processPendingOrder,
      {
        concurrency: 5,
        limiter: {
          max: 50,
          duration: 60000,
        },
        onCompleted: (job, result) => {
          console.log(
            `✅ [Calc] Pending order job ${job.id} completed:`,
            result
          );
        },
        onFailed: (job, error) => {
          console.error(
            `❌ [Calc] Pending order job ${job?.id} failed:`,
            error.message
          );
        },
        onError: (error) => {
          console.error("❌ [Calc] Pending orders worker error:", error);
        },
      }
    );

    // Register queue events for monitoring
    const emailQueueEvents = queueManager.registerQueueEvents("calc-emails");
    const pendingOrdersQueueEvents =
      queueManager.registerQueueEvents("pending-orders");

    emailQueueEvents.on("completed", ({ jobId }) => {
      console.log(`✅ [Calc] Email job ${jobId} completed successfully`);
    });

    pendingOrdersQueueEvents.on("completed", ({ jobId }) => {
      console.log(
        `✅ [Calc] Pending order job ${jobId} completed successfully`
      );
    });

    console.log("✅ Calc server queues initialized successfully");
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

export { emailQueue, pendingOrdersQueue };
