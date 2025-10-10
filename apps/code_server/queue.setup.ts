import { QueueManager } from "../../shared/queueManager";
import {
  processCodeExecutionJob,
  CodeExecutionJobData,
} from "./workers/codeExecutionWorker";
import { Queue, Job } from "bullmq";

/**
 * Code Server Queue Setup
 *
 * This module initializes queues and workers specific to the code execution server.
 */

let codeExecutionQueue: Queue<CodeExecutionJobData> | undefined;

export async function setupCodeQueues(
  queueManager: QueueManager
): Promise<void> {
  if (!queueManager.isQueueReady()) {
    console.log(
      "⚠️  Queue system not ready - code execution queues will not be initialized"
    );
    return;
  }

  try {
    // Register code execution queue
    codeExecutionQueue = queueManager.registerQueue<CodeExecutionJobData>(
      "code-execution",
      {
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 200, // Keep last 200 failed jobs
          attempts: 2, // Retry once
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      }
    );

    // Register code execution worker
    queueManager.registerWorker<CodeExecutionJobData>(
      "code-execution",
      processCodeExecutionJob,
      {
        concurrency: 5, // Process 5 jobs concurrently
        limiter: {
          max: 10, // Max 10 jobs
          duration: 1000, // Per second
        },
        onCompleted: async (job: Job<CodeExecutionJobData>, result: any) => {
          console.log(
            `✅ Code execution job ${job.id} completed for language: ${job.data.language}`
          );
        },
        onFailed: async (
          job: Job<CodeExecutionJobData> | undefined,
          error: Error
        ) => {
          if (job) {
            console.error(
              `❌ Code execution job ${job.id} failed for language: ${job.data.language}`,
              error.message
            );
          } else {
            console.error(`❌ Code execution job failed:`, error.message);
          }
        },
      }
    );

    console.log("✅ Code execution queues and workers initialized");
  } catch (error) {
    console.error("❌ Error setting up code execution queues:", error);
    throw error;
  }
}

/**
 * Add a code execution job to the queue
 */
export async function addCodeExecutionJob(
  data: CodeExecutionJobData
): Promise<Job<CodeExecutionJobData> | null> {
  if (!codeExecutionQueue) {
    console.error("❌ Code execution queue not initialized");
    return null;
  }

  try {
    const job = await codeExecutionQueue.add("execute-code", data, {
      priority: 1,
    });

    console.log(
      `📝 Added code execution job ${job.id} for language: ${data.language}`
    );
    return job;
  } catch (error) {
    console.error("❌ Error adding code execution job:", error);
    return null;
  }
}

/**
 * Get code execution queue instance
 */
export function getCodeExecutionQueue():
  | Queue<CodeExecutionJobData>
  | undefined {
  return codeExecutionQueue;
}
