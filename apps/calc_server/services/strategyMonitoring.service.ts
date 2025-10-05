import { Strategy, IStrategy } from "../models/strategy";
import { StrategyExecutionService } from "./strategyExecution.service";
import mongoose from "mongoose";

export interface StrategyMonitor {
  strategyId: string;
  status: "running" | "paused" | "stopped";
  lastExecution: Date;
  nextExecution?: Date;
  executionCount: number;
  errorCount: number;
  lastError?: string;
  executionFrequency: string; // e.g., "5m", "1h", "1d"
}

export class StrategyMonitoringService {
  private activeMonitors: Map<string, StrategyMonitor> = new Map();
  private executionService: StrategyExecutionService;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.executionService = new StrategyExecutionService();
  }

  async startMonitoring(
    strategy: IStrategy,
    executionFrequency: string = "5m"
  ): Promise<void> {
    const strategyId = strategy._id.toString();

    const monitor: StrategyMonitor = {
      strategyId,
      status: "running",
      lastExecution: new Date(),
      executionCount: 0,
      errorCount: 0,
      executionFrequency,
    };

    this.activeMonitors.set(strategyId, monitor);

    // Set up periodic execution based on provided frequency
    const intervalMs = this.getIntervalFromFrequency(executionFrequency);

    const interval = setInterval(async () => {
      await this.executeStrategyMonitored(strategyId);
    }, intervalMs);

    this.monitoringIntervals.set(strategyId, interval);

    console.log(
      `Started monitoring strategy: ${strategy.name} (${strategyId}) with frequency: ${executionFrequency}`
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

      // Execute strategy using the execution service
      const result = await this.executionService.executeStrategy(strategy);

      // Update monitor
      monitor.lastExecution = new Date();
      monitor.executionCount++;

      // Calculate next execution time
      const intervalMs = this.getIntervalFromFrequency(
        monitor.executionFrequency
      );
      monitor.nextExecution = new Date(Date.now() + intervalMs);

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
      } else {
        // Reset error count on successful execution
        monitor.errorCount = 0;
        monitor.lastError = undefined;
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

  private async getStrategyById(strategyId: string): Promise<IStrategy | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(strategyId)) {
        console.error(`Invalid strategy ID: ${strategyId}`);
        return null;
      }

      const strategy = await Strategy.findById(strategyId);
      return strategy;
    } catch (error) {
      console.error(`Error fetching strategy ${strategyId}:`, error);
      return null;
    }
  }

  private async updateStrategyStatus(
    strategyId: string,
    status: "active" | "inactive" | "paused" | "error"
  ): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(strategyId)) {
        console.error(`Invalid strategy ID: ${strategyId}`);
        return;
      }

      await Strategy.findByIdAndUpdate(
        strategyId,
        { status, updatedAt: new Date() },
        { new: true }
      );

      console.log(`Updated strategy ${strategyId} status to ${status}`);
    } catch (error) {
      console.error(`Error updating strategy ${strategyId} status:`, error);
    }
  }

  private async logExecution(strategyId: string, result: any): Promise<void> {
    try {
      // The execution result is already logged in the strategy's execution logs
      // by the StrategyExecutionService, so we just log to console here
      console.log(`Execution completed for strategy ${strategyId}:`, {
        success: result.success,
        action: result.action,
        executedTrades: result.executedTrades?.length || 0,
        error: result.error,
      });
    } catch (error) {
      console.error(
        `Error logging execution for strategy ${strategyId}:`,
        error
      );
    }
  }

  // Get strategies by user ID
  async getStrategiesByUserId(userId: string): Promise<IStrategy[]> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.error(`Invalid user ID: ${userId}`);
        return [];
      }

      const strategies = await Strategy.find({
        userId: new mongoose.Types.ObjectId(userId),
        status: "active",
      });

      return strategies;
    } catch (error) {
      console.error(`Error fetching strategies for user ${userId}:`, error);
      return [];
    }
  }

  // Start monitoring all active strategies for a user
  async startMonitoringForUser(
    userId: string,
    executionFrequency: string = "5m"
  ): Promise<void> {
    try {
      const strategies = await this.getStrategiesByUserId(userId);

      for (const strategy of strategies) {
        await this.startMonitoring(strategy, executionFrequency);
      }

      console.log(
        `Started monitoring ${strategies.length} strategies for user ${userId}`
      );
    } catch (error) {
      console.error(`Error starting monitoring for user ${userId}:`, error);
    }
  }

  // Stop monitoring all strategies for a user
  async stopMonitoringForUser(userId: string): Promise<void> {
    try {
      const strategies = await this.getStrategiesByUserId(userId);

      for (const strategy of strategies) {
        await this.stopMonitoring(strategy._id.toString());
      }

      console.log(`Stopped monitoring strategies for user ${userId}`);
    } catch (error) {
      console.error(`Error stopping monitoring for user ${userId}:`, error);
    }
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
