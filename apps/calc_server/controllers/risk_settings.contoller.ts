import { Request, Response } from "express";
import { RiskManagementService } from "../services/riskManagement.service";
import { Portfolio } from "../models";
import { RiskAction } from "../models/riskAction";

const riskService = new RiskManagementService();

export const riskController = {
  // GET /api/risk/settings
  getRiskSettings: async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const settings = await riskService.getRiskSettings(userId);
      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error("Get risk settings error:", error);
      res.status(500).json({
        error: "Failed to retrieve risk settings",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // POST /api/risk/settings
  updateRiskSettings: async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const updates = req.body;
      const settings = await riskService.updateRiskSettings(userId, updates);

      res.json({
        success: true,
        message: "Risk settings updated successfully",
        data: settings,
      });
    } catch (error) {
      console.error("Update risk settings error:", error);
      res.status(500).json({
        error: "Failed to update risk settings",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // GET /api/risk/metrics
  getRiskMetrics: async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const metrics = await riskService.calculateRiskMetrics(userId);
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error("Get risk metrics error:", error);
      res.status(500).json({
        error: "Failed to calculate risk metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // GET /api/risk/positions
  getPositionRisks: async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const positionRisks = await riskService.getPositionRisks(userId);
      res.json({
        success: true,
        data: positionRisks,
      });
    } catch (error) {
      console.error("Get position risks error:", error);
      res.status(500).json({
        error: "Failed to get position risks",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // POST /api/risk/calculate-position-size
  calculatePositionSize: async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { entryPrice, stopLossPrice } = req.body;

      if (!entryPrice || entryPrice <= 0) {
        return res.status(400).json({ error: "Valid entry price is required" });
      }

      const positionSize = await riskService.calculateOptimalPositionSize(
        userId,
        entryPrice,
        stopLossPrice
      );

      res.json({
        success: true,
        data: positionSize,
      });
    } catch (error) {
      console.error("Calculate position size error:", error);
      res.status(500).json({
        error: "Failed to calculate position size",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // POST /api/risk/preset/:preset
  applyRiskPreset: async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      const preset = req.params.preset;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (
        !["conservative", "moderate", "aggressive"].includes(preset as string)
      ) {
        return res.status(400).json({ error: "Invalid risk preset" });
      }

      const settings = await riskService.getRiskSettings(userId);
      settings.riskPreset = preset as
        | "conservative"
        | "moderate"
        | "aggressive"
        | "custom";
      await settings.save();

      res.json({
        success: true,
        message: `Applied ${preset} risk preset`,
        data: settings,
      });
    } catch (error) {
      console.error("Apply risk preset error:", error);
      res.status(500).json({
        error: "Failed to apply risk preset",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // POST /api/risk/monitor-positions
  monitorPositions: async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      await riskService.monitorPositions(userId);

      res.json({
        success: true,
        message: "Position monitoring completed",
      });
    } catch (error) {
      console.error("Monitor positions error:", error);
      res.status(500).json({
        error: "Failed to monitor positions",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
  // GET /api/risk/:userId
  getRiskSettingsByUserId: async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const settings = await riskService.getRiskSettings(userId);
      if (!settings) {
        return res.status(404).json({ error: "Risk settings not found" });
      }

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error("Get risk settings by user ID error:", error);
      res.status(500).json({
        error: "Failed to retrieve risk settings",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // GET /api/risk/dashboard - Comprehensive risk dashboard data
  getRiskDashboard: async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const riskService = new RiskManagementService();

      // Gather all risk data in parallel
      const [settings, metrics, positionRisks, portfolio] = await Promise.all([
        riskService.getRiskSettings(userId),
        riskService.calculateRiskMetrics(userId),
        riskService.getPositionRisks(userId),
        Portfolio.findOne({ userId }),
      ]);

      // Calculate additional metrics
      const atRiskPositions = positionRisks.filter((p) => p.isAtRisk);
      const totalRiskExposure = positionRisks.reduce(
        (sum, p) => sum + p.riskAmount,
        0
      );
      const portfolioValue = portfolio ? portfolio.totalEquity : 0;
      const riskExposurePercent =
        portfolioValue > 0 ? (totalRiskExposure / portfolioValue) * 100 : 0;

      res.json({
        success: true,
        data: {
          settings,
          metrics,
          positionRisks,
          summary: {
            totalPositions: positionRisks.length,
            atRiskPositions: atRiskPositions.length,
            totalRiskExposure,
            riskExposurePercent,
            portfolioValue,
            monitoringActive:
              settings.autoStopLossEnabled || settings.autoTakeProfitEnabled,
          },
        },
      });
    } catch (error) {
      console.error("Get risk dashboard error:", error);
      res.status(500).json({
        error: "Failed to retrieve risk dashboard",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // POST /api/risk/manual-check - Trigger manual risk check
  triggerManualRiskCheck: async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const riskService = new RiskManagementService();
      await riskService.monitorPositions(userId);

      res.json({
        success: true,
        message: "Manual risk check completed",
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Manual risk check error:", error);
      res.status(500).json({
        error: "Failed to perform manual risk check",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // GET /api/risk/history - Get risk action history
  getRiskHistory: async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { limit = 50, symbol, action } = req.query;

      const query: any = { userId };
      if (symbol) query.symbol = symbol;
      if (action) query.action = action;

      const riskActions = await RiskAction.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit));

      res.json({
        success: true,
        data: riskActions,
      });
    } catch (error) {
      console.error("Get risk history error:", error);
      res.status(500).json({
        error: "Failed to retrieve risk history",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // GET /api/risk/monitoring-status - Get current monitoring status
  getMonitoringStatus: async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const riskService = new RiskManagementService();
      const settings = await riskService.getRiskSettings(userId);
      const portfolio = await Portfolio.findOne({ userId });

      const monitoringActive =
        settings.autoStopLossEnabled || settings.autoTakeProfitEnabled;
      const hasPositions = portfolio && portfolio.positions.length > 0;

      // Get recent risk actions
      const recentActions = await RiskAction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5);

      res.json({
        success: true,
        data: {
          monitoringActive,
          hasPositions,
          positionCount: portfolio?.positions.length || 0,
          settings: {
            autoStopLoss: settings.autoStopLossEnabled,
            autoTakeProfit: settings.autoTakeProfitEnabled,
            stopLossPercentage: settings.stopLossPercentage,
            takeProfitPercentage: settings.takeProfitPercentage,
            trailingStop: settings.trailingStopEnabled,
          },
          recentActions: recentActions.map((action) => ({
            action: action.action,
            symbol: action.symbol,
            reason: action.reason,
            status: action.status,
            timestamp: action.createdAt,
          })),
        },
      });
    } catch (error) {
      console.error("Get monitoring status error:", error);
      res.status(500).json({
        error: "Failed to retrieve monitoring status",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // POST /api/risk/toggle - Quick toggle for enable/disable
  toggleRiskMonitoring: async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const { enabled } = req.body;
      if (typeof enabled !== "boolean") {
        return res
          .status(400)
          .json({ error: "enabled field must be a boolean" });
      }

      const riskService = new RiskManagementService();
      const settings = await riskService.updateRiskSettings(userId, {
        enabled,
      });

      res.json({
        success: true,
        message: `Risk monitoring ${enabled ? "enabled" : "disabled"}`,
        data: {
          enabled: settings.enabled,
          monitoringActive:
            enabled &&
            (settings.autoStopLossEnabled || settings.autoTakeProfitEnabled),
        },
      });
    } catch (error) {
      console.error("Toggle risk monitoring error:", error);
      res.status(500).json({
        error: "Failed to toggle risk monitoring",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};
