import { Strategy } from "../models/strategy";
import { StrategyExecutionService } from "./strategyExecution.service";

export interface StrategyMonitor {
  strategyId: string;
  status: "running" | "paused" | "stopped";
  lastExecution: Date;
  nextExecution?: Date;
  executionCount: number;
  errorCount: number;
  lastError?: string;
}

export class StrategyMonitoringService {
  private activeMonitors: Map<string, StrategyMonitor> = new Map();
  private executionService: StrategyExecutionService;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.executionService = new StrategyExecutionService();
  }

  async startMonitoring(strategy: Strategy): Promise<void> {
    const monitor: StrategyMonitor = {
      strategyId: strategy._id,
      status: "running",
      lastExecution: new Date(),
      executionCount: 0,
      errorCount: 0,
    };

    this.activeMonitors.set(strategy._id, monitor);

    // Set up periodic execution based on strategy frequency
    const intervalMs = this.getIntervalFromFrequency(
      strategy.executionFrequency
    );

    const interval = setInterval(async () => {
      await this.executeStrategyMonitored(strategy._id);
    }, intervalMs);

    this.monitoringIntervals.set(strategy._id, interval);

    console.log(
      `Started monitoring strategy: ${strategy.name} (${strategy._id})`
    );
  }

  async stopMonitoring(strategyId: string): Promise<void> {
    const interval = this.monitoringIntervals.get(strategyId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(strategyId);
    }

    const monitor = this.activeMonitors.get(strategyId);
    if (monitor) {
      monitor.status = "stopped";
    }

    console.log(`Stopped monitoring strategy: ${strategyId}`);
  }

  async pauseMonitoring(strategyId: string): Promise<void> {
    const monitor = this.activeMonitors.get(strategyId);
    if (monitor) {
      monitor.status = "paused";
    }
  }

  async resumeMonitoring(strategyId: string): Promise<void> {
    const monitor = this.activeMonitors.get(strategyId);
    if (monitor) {
      monitor.status = "running";
    }
  }

  getMonitorStatus(strategyId: string): StrategyMonitor | undefined {
    return this.activeMonitors.get(strategyId);
  }

  getAllActiveMonitors(): StrategyMonitor[] {
    return Array.from(this.activeMonitors.values()).filter(
      (monitor) => monitor.status === "running"
    );
  }

  private async executeStrategyMonitored(strategyId: string): Promise<void> {
    const monitor = this.activeMonitors.get(strategyId);
    if (!monitor || monitor.status !== "running") {
      return;
    }

    try {
      // Fetch strategy from database
      const strategy = await this.getStrategyById(strategyId);
      if (!strategy || strategy.status !== "active") {
        await this.stopMonitoring(strategyId);
        return;
      }

      // Execute strategy
      const result = await this.executionService.executeStrategy(strategy);

      // Update monitor
      monitor.lastExecution = new Date();
      monitor.executionCount++;

      if (!result.success) {
        monitor.errorCount++;
        monitor.lastError = result.error;

        // Stop monitoring if too many errors
        if (monitor.errorCount >= 5) {
          console.error(
            `Stopping strategy ${strategyId} due to excessive errors`
          );
          await this.stopMonitoring(strategyId);
          await this.updateStrategyStatus(strategyId, "error");
        }
      }

      // Log execution result
      await this.logExecution(strategyId, result);
    } catch (error) {
      console.error(`Error executing strategy ${strategyId}:`, error);

      if (monitor) {
        monitor.errorCount++;
        monitor.lastError =
          error instanceof Error ? error.message : "Unknown error";
      }
    }
  }

  private getIntervalFromFrequency(frequency: string): number {
    switch (frequency) {
      case "1m":
        return 60 * 1000; // 1 minute
      case "5m":
        return 5 * 60 * 1000; // 5 minutes
      case "15m":
        return 15 * 60 * 1000; // 15 minutes
      case "1h":
        return 60 * 60 * 1000; // 1 hour
      case "4h":
        return 4 * 60 * 60 * 1000; // 4 hours
      case "1d":
        return 24 * 60 * 60 * 1000; // 1 day
      default:
        return 5 * 60 * 1000; // Default to 5 minutes
    }
  }

  private async getStrategyById(strategyId: string): Promise<Strategy | null> {
    // This would fetch from database - placeholder implementation
    console.log(`Fetching strategy ${strategyId} from database`);
    return null;
  }

  private async updateStrategyStatus(
    strategyId: string,
    status: string
  ): Promise<void> {
    // This would update strategy status in database
    console.log(`Updating strategy ${strategyId} status to ${status}`);
  }

  private async logExecution(strategyId: string, result: any): Promise<void> {
    // This would log execution results to database
    console.log(`Logging execution for strategy ${strategyId}:`, result);
  }

  // Cleanup on service shutdown
  async shutdown(): Promise<void> {
    console.log("Shutting down strategy monitoring service...");

    // Clear all intervals
    for (const [strategyId, interval] of this.monitoringIntervals) {
      clearInterval(interval);
      console.log(`Stopped monitoring ${strategyId}`);
    }

    this.monitoringIntervals.clear();
    this.activeMonitors.clear();
  }
}

// Singleton instance
export const strategyMonitoringService = new StrategyMonitoringService();

// Graceful shutdown
process.on("SIGTERM", () => strategyMonitoringService.shutdown());
process.on("SIGINT", () => strategyMonitoringService.shutdown());
