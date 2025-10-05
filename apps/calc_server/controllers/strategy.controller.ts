import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Strategy } from "../models";
import { ErrorHandling } from "../../../middleware/errorHandler";
import { AuthenticatedRequest } from "../../../types/auth";
import { fetchLivePrice } from "../utils/fetchPrice";

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
        currentPerformance: {
          netProfit: 0,
          roi: 0,
          winRate: 0,
          profitFactor: 0,
          totalTrades: 0,
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
      const userId = req.user._id;
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
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
      const userId = req.user._id;
      const { id } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
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
      const userId = req.user._id;
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
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
      const userId = req.user._id;
      const { id } = req.params;
      const { status } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
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
      const userId = req.user._id;
      const { id } = req.params;
      const { limit = 50, page = 1, status } = req.query;

      if (!mongoose.Types.ObjectId.isValid(id)) {
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
      const userId = req.user._id;
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
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
      const userId = req.user._id;
      const { id } = req.params;
      const { symbol, dryRun = true } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new ErrorHandling("Invalid strategy ID", 400));
      }

      const strategy = await Strategy.findOne({ _id: id, userId });
      if (!strategy) {
        return next(new ErrorHandling("Strategy not found", 404));
      }

      if (!symbol) {
        return next(
          new ErrorHandling("Symbol is required for manual execution", 400)
        );
      }

      // Get current price for the symbol
      const currentPrice = await fetchLivePrice(symbol);

      // Execute strategy logic (simplified for now)
      const activeRules = strategy.activeRules;
      const executions = [];

      for (const rule of activeRules) {
        if (rule.condition.symbol === symbol.toUpperCase()) {
          // Check if rule can execute (cooldown)
          if (!strategy.canRuleExecute(rule.id)) {
            continue;
          }

          // Simulate condition evaluation (in real implementation, this would use market data)
          const conditionMet = Math.random() > 0.5; // Random for demo

          if (conditionMet) {
            const execution = {
              ruleId: rule.id,
              ruleName: rule.name || `Rule ${rule.id}`,
              symbol: symbol.toUpperCase(),
              action: rule.action.type,
              quantity: rule.action.quantity,
              price: currentPrice,
              confidence: Math.floor(Math.random() * 40) + 60, // 60-100% confidence
              reason: `${rule.condition.indicator.toUpperCase()} condition met`,
              status: dryRun ? "simulated" : "pending",
            };

            executions.push(execution);

            // Add to execution logs if not dry run
            if (!dryRun) {
              strategy.addExecutionLog(execution as any);

              // Update rule's last executed time
              const ruleIndex = strategy.rules.findIndex(
                (r) => r.id === rule.id
              );
              if (ruleIndex !== -1) {
                strategy.rules[ruleIndex].lastExecuted = new Date();
              }
            }
          }
        }
      }

      if (!dryRun && executions.length > 0) {
        await strategy.save();
      }

      res.status(200).json({
        success: true,
        data: {
          executions,
          currentPrice,
          dryRun,
          activeRulesCount: activeRules.length,
        },
        message: `Strategy ${dryRun ? "simulated" : "executed"} successfully`,
      });
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
};
