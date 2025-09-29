import { Request, Response } from "express";
import { RiskManagementService } from "../services/riskManagement.service";

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

      if (!["conservative", "moderate", "aggressive"].includes(preset as string)) {
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
};
