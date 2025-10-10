import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../../types/auth";
import { addCodeExecutionJob, getCodeExecutionQueue } from "../queue.setup";

export const executeCode = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { language, code } = req.body;
    const userId = req.user?._id;

    if (!language || !code) {
      return res.status(400).json({ error: "Language and code are required" });
    }

    // Validate code length (max 50KB)
    if (code.length > 50000) {
      return res
        .status(400)
        .json({ error: "Code exceeds maximum length of 50KB" });
    }

    // Supported languages
    const supportedLanguages = [
      "python",
      "javascript",
      "typescript",
      "go",
      "java",
      "c++",
      "rust",
    ];
    if (!supportedLanguages.includes(language)) {
      return res
        .status(400)
        .json({ error: `Unsupported language: ${language}` });
    }

    // Add job to queue
    const job = await addCodeExecutionJob({
      language,
      code,
      userId: userId?.toString(),
    });

    if (!job) {
      return res.status(500).json({ error: "Failed to queue code execution" });
    }

    // Return job ID for polling
    return res.status(200).json({ jobId: job.id });
  } catch (error) {
    console.error("Error executing code:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getExecutionStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ error: "Job ID is required" });
    }

    const queue = getCodeExecutionQueue();
    if (!queue) {
      return res.status(500).json({ error: "Queue not available" });
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check if user owns the job
    if (job.data.userId !== req.user?._id?.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    const state = await job.getState();
    if (state === "completed") {
      return res.status(200).json({
        status: "completed",
        output: job.returnvalue,
      });
    } else if (state === "failed") {
      return res.status(200).json({
        status: "failed",
        output: job.failedReason,
      });
    } else {
      return res.status(200).json({
        status: state,
      });
    }
  } catch (error) {
    console.error("Error getting execution status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getJobStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ error: "Job ID is required" });
    }

    // Get job status from queue
    // This can be implemented if needed for async job tracking

    return res.status(200).json({
      message: "Job status endpoint - implement if needed for async execution",
    });
  } catch (error) {
    console.error("Error getting job status:", error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to get job status",
    });
  }
};
