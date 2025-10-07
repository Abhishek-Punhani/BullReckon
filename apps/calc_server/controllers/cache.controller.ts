import { Request, Response, NextFunction } from "express";
import { cacheManager } from "../../../middleware/cacheMiddleware";

export const cacheController = {
  /**
   * Get cache statistics
   * GET /api/cache/stats
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await cacheManager.getStats();

      res.status(200).json({
        success: true,
        data: stats,
        message: "Cache statistics retrieved successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Clear all cache
   * DELETE /api/cache
   */
  async clearAll(req: Request, res: Response, next: NextFunction) {
    try {
      await cacheManager.clear();

      res.status(200).json({
        success: true,
        message: "All cache cleared successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Clear cache by pattern
   * DELETE /api/cache/pattern/:pattern
   */
  async clearPattern(req: Request, res: Response, next: NextFunction) {
    try {
      const { pattern } = req.params;

      if (!pattern) {
        return res.status(400).json({
          success: false,
          error: "Pattern is required",
        });
      }

      const deleted = await cacheManager.deletePattern(pattern);

      res.status(200).json({
        success: true,
        data: { deleted },
        message: `Cleared ${deleted} cache entries matching pattern: ${pattern}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
};
