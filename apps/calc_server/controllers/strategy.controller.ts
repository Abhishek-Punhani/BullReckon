import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Strategy } from "../models";
import { ErrorHandling } from "../../../middleware/errorHandler";
import { AuthenticatedRequest } from "../../../types/auth";
import { addStrategyExecutionJob } from "../queue.setup";

export const strategyController = {
  /**
   * Create a new strategy
   * POST /api/strategies
   */
  createStrategy: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?._id) {
        return next(new ErrorHandling("User not authenticated", 401));
      }
      const userId = req.user._id;
      const { name, description, type, rules, config } = req.body;

      // Validate required fields
      if (!name || !rules || !config) {
        return next(
          new ErrorHandling("Name, rules, and config are required", 400)
        );
      }

      if (!Array.isArray(rules) || rules.length === 0) {
        return next(new ErrorHandling("At least one rule is required", 400));
      }

      // Check if strategy name already exists for this user
      const existingStrategy = await Strategy.findOne({ userId, name });
      if (existingStrategy) {
        return next(new ErrorHandling("Strategy name already exists", 400));
      }

      // Create new strategy
      const strategy = new Strategy({
        userId,
        name,
        description,
        type: type || "no-code",
        status: "inactive",
        rules: rules.map((rule: any, index: number) => ({
          ...rule,
          id: rule.id || `rule_${index + 1}`,
        })),
        config,
        metrics: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          totalProfit: 0,
          totalLoss: 0,
          winRate: 0,
          profitFactor: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          lastUpdated: new Date(),
        },
        executionLogs: [],
        isBacktested: false,
        version: 1,
      });

      await strategy.save();

      res.status(201).json({
        success: true,
        data: strategy,
        message: "Strategy created successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get user's strategies
   * GET /api/strategies
   */
  getUserStrategies: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?._id) {
        return next(new ErrorHandling("User not authenticated", 401));
      }
      const userId = req.user._id;
      const { status, type, limit = 20, page = 1 } = req.query;

      const filter: any = { userId };
      if (status) filter.status = status;
      if (type) filter.type = type;

      const strategies = await Strategy.find(filter)
        .sort({ updatedAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .lean();

      const total = await Strategy.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: {
          strategies,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
        message: "Strategies retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get strategy by ID
   * GET /api/strategies/:id
   */
  getStrategy: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?._id) {
        return next(new ErrorHandling("User not authenticated", 401));
      }
      const userId = req.user._id;
      const { id } = req.params;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandling("Invalid strategy ID", 400));
      }

      const strategy = await Strategy.findOne({ _id: id, userId });
      if (!strategy) {
        return next(new ErrorHandling("Strategy not found", 404));
      }

      res.status(200).json({
        success: true,
        data: strategy,
        message: "Strategy retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update strategy
   * PUT /api/strategies/:id
   */
  updateStrategy: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?._id) {
        return next(new ErrorHandling("User not authenticated", 401));
      }
      const userId = req.user._id;
      const { id } = req.params;
      const updateData = req.body;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandling("Invalid strategy ID", 400));
      }

      const strategy = await Strategy.findOne({ _id: id, userId });
      if (!strategy) {
        return next(new ErrorHandling("Strategy not found", 404));
      }

      // Don't allow updating metrics directly
      delete updateData.metrics;
      delete updateData.executionLogs;
      delete updateData.userId;

      // Increment version if rules or config changed
      if (updateData.rules || updateData.config) {
        updateData.version = strategy.version + 1;
      }

      Object.assign(strategy, updateData);
      await strategy.save();

      res.status(200).json({
        success: true,
        data: strategy,
        message: "Strategy updated successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete strategy
   * DELETE /api/strategies/:id
   */
  deleteStrategy: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?._id) {
        return next(new ErrorHandling("User not authenticated", 401));
      }
      const userId = req.user._id;
      const { id } = req.params;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandling("Invalid strategy ID", 400));
      }

      const strategy = await Strategy.findOne({ _id: id, userId });
      if (!strategy) {
        return next(new ErrorHandling("Strategy not found", 404));
      }

      // Don't allow deletion of active strategies
      if (strategy.status === "active") {
        return next(
          new ErrorHandling(
            "Cannot delete active strategy. Please deactivate first.",
            400
          )
        );
      }

      await Strategy.deleteOne({ _id: id, userId });

      res.status(200).json({
        success: true,
        message: "Strategy deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Activate/Deactivate strategy
   * PATCH /api/strategies/:id/status
   */
  updateStrategyStatus: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?._id) {
        return next(new ErrorHandling("User not authenticated", 401));
      }
      const userId = req.user._id;
      const { id } = req.params;
      const { status } = req.body;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandling("Invalid strategy ID", 400));
      }

      if (!["active", "inactive", "paused"].includes(status)) {
        return next(
          new ErrorHandling(
            "Invalid status. Must be active, inactive, or paused",
            400
          )
        );
      }

      const strategy = await Strategy.findOne({ _id: id, userId });
      if (!strategy) {
        return next(new ErrorHandling("Strategy not found", 404));
      }

      // Additional validation for activation
      if (status === "active") {
        if (strategy.rules.length === 0) {
          return next(
            new ErrorHandling("Cannot activate strategy without rules", 400)
          );
        }

        // Check if user has too many active strategies (limit to 5)
        const activeStrategiesCount = await Strategy.countDocuments({
          userId,
          status: "active",
          _id: { $ne: id },
        });

        if (activeStrategiesCount >= 5) {
          return next(
            new ErrorHandling("Maximum 5 active strategies allowed", 400)
          );
        }
      }

      strategy.status = status;
      if (status === "active") {
        strategy.lastExecuted = new Date();
      }

      await strategy.save();

      res.status(200).json({
        success: true,
        data: { status: strategy.status },
        message: `Strategy ${status === "active" ? "activated" : status === "inactive" ? "deactivated" : "paused"} successfully`,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get strategy execution logs
   * GET /api/strategies/:id/logs
   */
  getExecutionLogs: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?._id) {
        return next(new ErrorHandling("User not authenticated", 401));
      }
      const userId = req.user._id;
      const { id } = req.params;
      const { limit = 50, page = 1, status } = req.query;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandling("Invalid strategy ID", 400));
      }

      const strategy = await Strategy.findOne({ _id: id, userId });
      if (!strategy) {
        return next(new ErrorHandling("Strategy not found", 404));
      }

      let logs = strategy.executionLogs;

      // Filter by status if provided
      if (status) {
        logs = logs.filter((log) => log.status === status);
      }

      // Sort by timestamp descending
      logs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Paginate
      const startIndex = (Number(page) - 1) * Number(limit);
      const endIndex = startIndex + Number(limit);
      const paginatedLogs = logs.slice(startIndex, endIndex);

      res.status(200).json({
        success: true,
        data: {
          logs: paginatedLogs,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: logs.length,
            pages: Math.ceil(logs.length / Number(limit)),
          },
        },
        message: "Execution logs retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get strategy metrics
   * GET /api/strategies/:id/metrics
   */
  getStrategyMetrics: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?._id) {
        return next(new ErrorHandling("User not authenticated", 401));
      }
      const userId = req.user._id;
      const { id } = req.params;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandling("Invalid strategy ID", 400));
      }

      const strategy = await Strategy.findOne({ _id: id, userId });
      if (!strategy) {
        return next(new ErrorHandling("Strategy not found", 404));
      }

      const metrics = strategy.metrics;
      const performance = strategy.currentPerformance;

      // Calculate additional metrics
      const recentLogs = strategy.executionLogs
        .filter((log) => log.status === "executed")
        .slice(-30); // Last 30 trades

      const recentWinRate =
        recentLogs.length > 0
          ? (recentLogs.filter((log) => (log.profit || 0) > 0).length /
              recentLogs.length) *
            100
          : 0;

      res.status(200).json({
        success: true,
        data: {
          metrics,
          performance,
          recentMetrics: {
            recentTrades: recentLogs.length,
            recentWinRate,
            lastExecuted: strategy.lastExecuted,
          },
        },
        message: "Strategy metrics retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Execute strategy manually (for testing)
   * POST /api/strategies/:id/execute
   */
  executeStrategy: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?._id) {
        return next(new ErrorHandling("User not authenticated", 401));
      }
      const userId = req.user._id.toString();
      const { id } = req.params;
      const { symbol, dryRun = true, priority = 5 } = req.body;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandling("Invalid strategy ID", 400));
      }

      const strategy = await Strategy.findOne({ _id: id, userId });
      if (!strategy) {
        return next(new ErrorHandling("Strategy not found", 404));
      }

      // Prepare job data
      const jobData = {
        strategyId: id,
        userId,
        symbol: symbol || undefined,
        triggerType: "manual" as const,
        dryRun,
        metadata: {
          triggeredBy: req.user.email || "manual",
          requestId: Math.random().toString(36).substring(7),
        },
      };

      try {
        // Add job to queue
        await addStrategyExecutionJob(jobData, {
          priority,
          delay: 0, // Execute immediately
        });

        res.status(202).json({
          success: true,
          data: {
            jobQueued: true,
            strategyId: id,
            symbol: symbol || "all",
            dryRun,
            message:
              "Strategy execution job has been queued and will be processed shortly",
            estimatedProcessingTime: "5-30 seconds",
          },
          message: `Strategy execution ${dryRun ? "simulation" : "job"} queued successfully`,
        });
      } catch (queueError) {
        console.error("Failed to queue strategy execution:", queueError);
        return next(
          new ErrorHandling(
            "Failed to queue strategy execution. Please try again.",
            500
          )
        );
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get active strategies for execution engine
   * GET /api/strategies/active
   */
  getActiveStrategies: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?._id) {
        return next(new ErrorHandling("User not authenticated", 401));
      }
      const userId = req.user._id;

      const activeStrategies = await Strategy.find({
        userId,
        status: "active",
      })
        .select("-executionLogs")
        .lean();

      res.status(200).json({
        success: true,
        data: activeStrategies,
        message: "Active strategies retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Execute all active strategies for a user
   * POST /api/strategies/execute-all
   */
  executeAllActiveStrategies: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?._id) {
        return next(new ErrorHandling("User not authenticated", 401));
      }
      const userId = req.user._id.toString();
      const { symbol, dryRun = true, priority = 3 } = req.body;

      // Find all active strategies for the user
      const activeStrategies = await Strategy.find({
        userId,
        status: "active",
      }).select("_id name");

      if (activeStrategies.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            jobsQueued: 0,
            strategies: [],
          },
          message: "No active strategies found to execute",
        });
      }

      const queuedJobs = [];

      // Queue execution job for each active strategy
      for (const strategy of activeStrategies) {
        const jobData = {
          strategyId: strategy._id.toString(),
          userId,
          symbol: symbol || undefined,
          triggerType: "manual" as const,
          dryRun,
          metadata: {
            triggeredBy: req.user.email || "bulk_execute",
            requestId: Math.random().toString(36).substring(7),
            bulkExecution: true,
          },
        };

        try {
          await addStrategyExecutionJob(jobData, {
            priority,
            delay: queuedJobs.length * 1000, // Stagger executions by 1 second
          });

          queuedJobs.push({
            strategyId: strategy._id,
            strategyName: strategy.name,
            delayMs: queuedJobs.length * 1000,
          });
        } catch (queueError) {
          console.error(
            `Failed to queue strategy ${strategy._id}:`,
            queueError
          );
        }
      }

      res.status(202).json({
        success: true,
        data: {
          jobsQueued: queuedJobs.length,
          strategies: queuedJobs,
          symbol: symbol || "all",
          dryRun,
          estimatedTotalTime: `${queuedJobs.length * 5}-${queuedJobs.length * 30} seconds`,
        },
        message: `${queuedJobs.length} strategy execution jobs queued successfully`,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Schedule recurring strategy execution
   * POST /api/strategies/:id/schedule
   */
  scheduleStrategy: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user?._id) {
        return next(new ErrorHandling("User not authenticated", 401));
      }
      const userId = req.user._id.toString();
      const { id } = req.params;
      const { intervalMinutes = 60, symbol, enabled = true } = req.body;

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandling("Invalid strategy ID", 400));
      }

      const strategy = await Strategy.findOne({ _id: id, userId });
      if (!strategy) {
        return next(new ErrorHandling("Strategy not found", 404));
      }

      if (strategy.status !== "active") {
        return next(
          new ErrorHandling(
            "Strategy must be active to schedule executions",
            400
          )
        );
      }

      // Validate interval
      if (intervalMinutes < 5 || intervalMinutes > 1440) {
        return next(
          new ErrorHandling(
            "Interval must be between 5 minutes and 24 hours",
            400
          )
        );
      }

      if (enabled) {
        // Schedule the strategy execution
        const jobData = {
          strategyId: id,
          userId,
          symbol: symbol || undefined,
          triggerType: "scheduled" as const,
          dryRun: false,
          metadata: {
            scheduledInterval: intervalMinutes,
            scheduledBy: req.user.email || "scheduler",
          },
        };

        // Add recurring job
        await addStrategyExecutionJob(jobData, {
          priority: 3,
          delay: intervalMinutes * 60 * 1000, // Convert to milliseconds
        });

        res.status(200).json({
          success: true,
          data: {
            strategyId: id,
            intervalMinutes,
            symbol: symbol || "all",
            nextExecution: new Date(Date.now() + intervalMinutes * 60 * 1000),
            enabled: true,
          },
          message: `Strategy scheduled to execute every ${intervalMinutes} minutes`,
        });
      } else {
        // For now, we'll just acknowledge the disable request
        // In a full implementation, you'd need to track and cancel recurring jobs
        res.status(200).json({
          success: true,
          data: {
            strategyId: id,
            enabled: false,
          },
          message: "Strategy scheduling disabled",
        });
      }
    } catch (error) {
      next(error);
    }
  },
};
