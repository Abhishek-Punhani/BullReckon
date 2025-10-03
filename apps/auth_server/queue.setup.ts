import { QueueManager } from "../../shared/queueManager";
import { processEmailJob, EmailJobData } from "./workers/emailWorker";
import { Queue } from "bullmq";

/**
 * Auth Server Queue Setup
 *
 * This module initializes queues and workers specific to the auth server.
 * Each service is responsible for registering its own queues and workers.
 */

let emailQueue: Queue<EmailJobData> | undefined;

export async function setupAuthQueues(
  queueManager: QueueManager
): Promise<void> {
  if (!queueManager.isQueueReady()) {
    console.log(
      "⚠️ Queue system not ready - auth queues will not be initialized"
    );
    return;
  }

  try {
    // Register email queue
    emailQueue = queueManager.registerQueue<EmailJobData>("auth-emails", {
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

    // Register email worker
    queueManager.registerWorker<EmailJobData>("auth-emails", processEmailJob, {
      concurrency: 10,
      limiter: {
        max: 30, // 30 emails per minute
        duration: 60000,
      },
      onCompleted: (job, result) => {
        console.log(`✅ [Auth] Email job ${job.id} completed:`, result);
      },
      onFailed: (job, error) => {
        console.error(`❌ [Auth] Email job ${job?.id} failed:`, error.message);
      },
      onError: (error) => {
        console.error("❌ [Auth] Email worker error:", error);
      },
    });

    // Register queue events for monitoring
    const queueEvents = queueManager.registerQueueEvents("auth-emails");

    queueEvents.on("completed", ({ jobId }) => {
      console.log(`✅ [Auth] Email job ${jobId} completed successfully`);
    });

    queueEvents.on("failed", ({ jobId, failedReason }) => {
      console.error(`❌ [Auth] Email job ${jobId} failed:`, failedReason);
    });

    console.log("✅ Auth server queues initialized successfully");
  } catch (error) {
    console.error("❌ Failed to setup auth queues:", error);
  }
}

/**
 * Add an email job to the queue
 */
export async function addAuthEmailJob(
  data: EmailJobData,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
  }
): Promise<void> {
  if (!emailQueue) {
    console.warn("⚠️ Email queue not initialized - processing directly");
    await processEmailJob({ data } as any);
    return;
  }

  await emailQueue.add("send-email", data, {
    priority: options?.priority || 5,
    delay: options?.delay,
    attempts: options?.attempts || 5,
    ...options,
  });
}

export { emailQueue };
