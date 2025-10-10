import { exec } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Supported languages and their Docker configurations
export const languageConfigs: Record<
  string,
  { image: string; command: string; extension: string; needsNetwork?: boolean }
> = {
  python: {
    image: "python:3.10",
    command: "python {file}",
    extension: "py",
    needsNetwork: false,
  },
  go: {
    image: "golang:1.20",
    command: "go run {file}",
    extension: "go",
    needsNetwork: false,
  },
  javascript: {
    image: "node:20",
    command: "node {file}",
    extension: "js",
    needsNetwork: false,
  },
};

// Temp directory management
const tempDir = path.resolve(__dirname, "../temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

export interface CodeExecutionOptions {
  language: string;
  code: string;
  userId?: string;
}

export interface CodeExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime?: number;
}

/**
 * Sanitize code for dangerous patterns
 */
export function sanitizeCode(code: string): { safe: boolean; reason?: string } {
  const dangerousPatterns = [
    { pattern: /rm\s+-rf/i, reason: "Dangerous file deletion command" },
    { pattern: /:\(\)\{\s*:\|:&\s*\};:/, reason: "Fork bomb detected" },
    // Removed eval and exec patterns as they're common in legitimate code
    { pattern: /\$\(.*\)/i, reason: "Command substitution detected" },
  ];

  for (const { pattern, reason } of dangerousPatterns) {
    if (pattern.test(code)) {
      return { safe: false, reason };
    }
  }

  return { safe: true };
}

/**
 * Execute code in a Docker container with security constraints
 */
export async function executeCodeInDocker(
  options: CodeExecutionOptions
): Promise<CodeExecutionResult> {
  const { language, code, userId } = options;
  const startTime = Date.now();
  const uniqueId = crypto.randomBytes(16).toString("hex");
  let tempFilePath: string | null = null;

  try {
    // Validate language
    if (!languageConfigs[language]) {
      return {
        success: false,
        output: "",
        error: `Unsupported language: ${language}`,
      };
    }

    // Sanitize code
    const sanitizeResult = sanitizeCode(code);
    if (!sanitizeResult.safe) {
      return {
        success: false,
        output: "",
        error: `Code validation failed: ${sanitizeResult.reason}`,
      };
    }

    const { image, command, extension } = languageConfigs[language];

    // Generate unique filename to avoid race conditions
    const tempFileName =
      language === "java"
        ? `Main_${uniqueId}.java`
        : `code_${uniqueId}.${extension}`;

    tempFilePath = path.join(tempDir, tempFileName);

    // Write the code to a temporary file
    fs.writeFileSync(tempFilePath, code, { mode: 0o644 });

    // Build docker command with security constraints
    // Removed :ro to allow package installation
    // Increased resource limits for better performance
    const dockerCommand = `docker run --rm \
      --memory="1g" \
      --cpus="2.0" \
      --pids-limit=200 \
      -v ${tempDir}:/app \
      -w /app \
      ${image} \
      sh -c "${command.replace("{file}", tempFileName)}"`;

    console.log(
      `[${userId || "anonymous"}] Executing ${language} code with ID: ${uniqueId}`
    );

    // Execute with timeout
    return await new Promise<CodeExecutionResult>((resolve) => {
      exec(
        dockerCommand,
        {
          timeout: 60000, // 60 seconds for backtesting
          maxBuffer: 1024 * 1024, // 1MB max output
        },
        (error, stdout, stderr) => {
          // Clean up the temporary file
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
              fs.unlinkSync(tempFilePath);
            } catch (cleanupError) {
              console.error("Cleanup error:", cleanupError);
            }
          }

          const executionTime = Date.now() - startTime;

          // Log raw output for debugging
          console.log(
            `[Debug] stdout length: ${stdout?.length || 0}, stderr length: ${stderr?.length || 0}`
          );
          console.log(`[Debug] stdout:`, stdout);
          console.log(`[Debug] stderr:`, stderr);

          if (error) {
            // Check if it's a timeout
            if (error.killed && error.signal === "SIGTERM") {
              resolve({
                success: false,
                output: "",
                error: "Execution timeout (60 seconds exceeded)",
                executionTime,
              });
              return;
            }

            // If there's stderr but also stdout, consider it a warning not an error
            if (stdout && stdout.trim()) {
              resolve({
                success: true,
                output: stdout,
                error: stderr ? `Warnings: ${stderr}` : undefined,
                executionTime,
              });
              return;
            }

            resolve({
              success: false,
              output: stderr || "",
              error: error.message || "Execution failed",
              executionTime,
            });
            return;
          }

          // Combine stdout and stderr for complete output
          const combinedOutput = [stdout, stderr]
            .filter(Boolean)
            .join("\n")
            .trim();

          resolve({
            success: true,
            output:
              combinedOutput || "Code executed successfully with no output",
            executionTime,
          });
        }
      );
    });
  } catch (error) {
    // Clean up on error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
    }

    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Unknown error",
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Verify Docker is available and running
 */
export async function verifyDockerAvailability(): Promise<boolean> {
  return new Promise((resolve) => {
    exec("docker --version", (error) => {
      if (error) {
        console.error("❌ Docker is not available:", error.message);
        resolve(false);
      } else {
        console.log("✅ Docker is available");
        resolve(true);
      }
    });
  });
}

/**
 * Pre-pull Docker images for better performance
 */
export async function prepullDockerImages(): Promise<void> {
  console.log("📦 Pre-pulling Docker images for code execution...");

  const images = Object.values(languageConfigs).map((config) => config.image);
  const uniqueImages = [...new Set(images)];

  for (const image of uniqueImages) {
    try {
      await new Promise<void>((resolve, reject) => {
        console.log(`  Pulling ${image}...`);
        exec(`docker pull ${image}`, (error) => {
          if (error) {
            console.error(`  ❌ Failed to pull ${image}:`, error.message);
            reject(error);
          } else {
            console.log(`  ✅ Pulled ${image}`);
            resolve();
          }
        });
      });
    } catch (error) {
      console.error(`  ⚠️ Skipping ${image} due to error`);
    }
  }

  console.log("✅ Docker images pre-pull completed");
}
