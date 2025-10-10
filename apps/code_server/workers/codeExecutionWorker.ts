import { Job } from "bullmq";
import {
  executeCodeInDocker,
  CodeExecutionResult,
} from "../services/codeExecutionService";
import fs from "fs";
import path from "path";

export interface CodeExecutionJobData {
  language: string;
  code: string;
  userId?: string;
}

// Create a temporary directory for code execution
const tempDir = path.resolve(__dirname, "../temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

/**
 * Process code execution job
 * This worker is responsible for executing user code in isolated Docker containers
 */
export async function processCodeExecutionJob(
  job: Job<CodeExecutionJobData>
): Promise<string> {
  const { language, code, userId } = job.data;

  console.log(`[Worker] Processing job ${job.id} for language: ${language}`);

  try {
    // Update job progress
    await job.updateProgress(10);

    // Execute code in Docker
    const result: CodeExecutionResult = await executeCodeInDocker({
      language,
      code,
      userId,
    });

    await job.updateProgress(90);

    // Log execution result
    console.log(
      `[Worker] Job ${job.id} completed - Success: ${result.success}, Time: ${result.executionTime}ms`
    );
    console.log(result);
    // Return output (error or success)
    if (!result.success) {
      return `Error: ${result.error}\n\n${result.output}`;
    }

    return result.output;
  } catch (error) {
    console.error(`[Worker] Job ${job.id} failed:`, error);
    throw new Error(
      `Code execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
