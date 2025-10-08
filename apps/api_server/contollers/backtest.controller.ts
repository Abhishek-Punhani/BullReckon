import { Request, Response, NextFunction } from "express";
import { Backtest } from "../models/backtest";
import { internalApi } from "../../../shared/internalApi.client";
export const postBacktestResults = async (  
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { backtest_id, status, results } = req.body;
    if (!backtest_id || !results || !results.summary) {
      return res
        .status(400)
        .json({ error: "Missing required backtest fields" });
    }

    // Fetch user details from auth server using email from req.apiUser
    const apiUserEmail = req.apiUser?.email;
    if (!apiUserEmail) {
      return res.status(401).json({ error: "API user email not found" });
    }

    const authServerUrl =
      process.env.AUTH_SERVER_URL || "http://localhost:4000";
    try {
      // Get user details using internal route
      const userRes = await internalApi.get(
        `${authServerUrl}/api/internal/user-by-email/${encodeURIComponent(apiUserEmail)}`
      );
      const userId = userRes.data?.user?._id;
      if (!userId) {
        return res.status(401).json({ error: "User not found in auth server" });
      }
      const backtest = await Backtest.create({
        userId,
        backtest_id,
        status,
        results,
      });
      return res.json({ status: "success", backtest_id: backtest.backtest_id });
    } catch (err) {
      return res.status(500).json({
        error: "Failed to fetch user or create backtest",
        details: err instanceof Error ? err.message : err,
      });
    }
  } catch (err) {
    next(err);
  }
};

export const getBacktestResults = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const backtest = await Backtest.findOne({ backtest_id: req.params.id });
    if (!backtest) return res.status(404).json({ error: "Backtest not found" });
    return res.json(backtest);
  } catch (err) {
    next(err);
  }
};
