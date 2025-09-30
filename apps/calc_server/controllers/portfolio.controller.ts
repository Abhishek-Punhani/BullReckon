import { Response, NextFunction } from "express";
import { Portfolio, Trade, RiskSettings } from "@repo/models";
import { ErrorHandling } from "../../../middleware/errorHandler";
import { AuthenticatedRequest } from "types/auth";
import { fetchMultiplePrices } from "../utils/fetchPrice";

// Helper function to generate mock performance data
const generatePerformanceData = (currentValue: number, period: string) => {
    const dataPoints = 30;
    const data = [];
    const now = new Date();

    for (let i = dataPoints; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Generate some variance around the current value
        const variance = (Math.random() - 0.5) * 0.1; // ±5% variance
        const progressFactor = (dataPoints - i) / dataPoints;
        const value =
            100000 +
            (currentValue - 100000) * progressFactor +
            currentValue * variance;

        data.push({
            date: date.toISOString().split("T")[0],
            value: Math.max(value, 0),
        });
    }

    return data;
};

export const portfolioController = {
    /**
     * Get user's complete portfolio data
     * GET /api/portfolio/:userId
     */
    getPortfolio: async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const userId = req.params.userId || req.user?.userId;

            if (!userId) {
                return next(new ErrorHandling("User ID is required", 400));
            }

            // Get portfolio from database
            let portfolio = await Portfolio.findOne({ userId });

            if (!portfolio) {
                // Create initial portfolio if doesn't exist
                portfolio = new Portfolio({
                    userId,
                    cash: 100000,
                    positions: [],
                    totalEquity: 100000,
                    realizedPnL: 0,
                    unrealizedPnL: 0,
                    dayChange: 0,
                    totalReturn: 0,
                });
                await portfolio.save();
            }

            // Extract symbols and fetch current prices
            const symbols = portfolio.positions.map((pos) => pos.symbol);
            const currentPrices = await fetchMultiplePrices(symbols);

            // Refresh market values
            await portfolio.refreshMarketValues(currentPrices);
            await portfolio.save();

            // Create snapshot DTO
            const portfolioSnapshot = portfolio.toSnapshotDTO(currentPrices);

            res.status(200).json({
                success: true,
                data: portfolioSnapshot,
                message: "Portfolio retrieved successfully",
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get portfolio performance history
     * GET /api/portfolio/:userId/performance
     */
    getPortfolioPerformance: async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { period = "1m" } = req.query;

            if (!req.user) {
                return next(new ErrorHandling("User ID is required", 400));
            }

            // For now, return mock data based on current portfolio value
            const portfolio = await Portfolio.findOne({ userId: req.user._id });
            const currentValue = portfolio?.totalEquity || 100000;

            // Generate performance data based on current value
            // TODO replace with real historical data
            const mockPerformanceData = generatePerformanceData(
                currentValue,
                period as string
            );

            res.status(200).json({
                success: true,
                data: mockPerformanceData,
                message: "Portfolio performance retrieved successfully",
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get recent trades for dashboard
     * GET /api/portfolio/:userId/recent-trades
     */
    getRecentTrades: async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const userId = req.params.userId || req.user?.userId;
            const { limit = 10 } = req.query;

            if (!userId) {
                return next(new ErrorHandling("User ID is required", 400));
            }

            const recentTrades = await Trade.find({ userId })
                .sort({ executedAt: -1 })
                .limit(Number(limit))
                .lean();

            res.status(200).json({
                success: true,
                data: recentTrades,
                count: recentTrades.length,
                message: "Recent trades retrieved successfully",
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Get dashboard summary data
     * GET /api/portfolio/:userId/dashboard
     */
    getDashboardData: async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const userId = req.params.userId || req.user?.userId;

            if (!userId) {
                return next(new ErrorHandling("User ID is required", 400));
            }

            // Get portfolio data
            const portfolio = await Portfolio.findOne({ userId });
            if (!portfolio) {
                return next(new ErrorHandling("Portfolio not found", 404));
            }

            // Get current prices and refresh portfolio
            const symbols = portfolio.positions.map((pos) => pos.symbol);
            const currentPrices = await fetchMultiplePrices(symbols);
            await portfolio.refreshMarketValues(currentPrices);
            await portfolio.save();

            // Get recent trades
            const recentTrades = await Trade.find({ userId })
                .sort({ executedAt: -1 })
                .limit(5)
                .lean();

            // Get risk settings
            let riskSettings = await RiskSettings.findOne({ userId });
            if (!riskSettings) {
                // Create default risk settings
                riskSettings = new RiskSettings({
                    userId,
                    stopLossPercentage: 5.0,
                    takeProfitPercentage: 10.0,
                    maxDrawdownPercentage: 20.0,
                    capitalAllocationPercentage: 25.0,
                    riskPreset: "moderate",
                });
                await riskSettings.save();
            }

            // Get performance data
            const performanceData = generatePerformanceData(
                portfolio.totalEquity,
                "1m"
            );

            res.status(200).json({
                success: true,
                data: {
                    portfolio: portfolio.toSnapshotDTO(currentPrices),
                    recentTrades,
                    riskSettings,
                    performanceData,
                },
                message: "Dashboard data retrieved successfully",
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Update portfolio position (used by trading)
     * POST /api/portfolio/:userId/positions
     */
    updatePosition: async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const userId = req.params.userId || req.user?.userId;
            const { symbol, quantity, price, action } = req.body;

            if (!userId || !symbol || !quantity || !price || !action) {
                return next(new ErrorHandling("Missing required fields", 400));
            }

            let portfolio = await Portfolio.findOne({ userId });
            if (!portfolio) {
                return next(new ErrorHandling("Portfolio not found", 404));
            }

            if (action === "BUY") {
                const totalCost = quantity * price;
                if (portfolio.cash < totalCost) {
                    return next(new ErrorHandling("Insufficient cash", 400));
                }

                portfolio.addPosition(symbol, quantity, price);
                portfolio.cash -= totalCost;
            } else if (action === "SELL") {
                const success = portfolio.removePosition(symbol, quantity);
                if (!success) {
                    return next(new ErrorHandling("Insufficient holdings", 400));
                }

                const proceeds = quantity * price;
                portfolio.cash += proceeds;
            }

            // Refresh market values
            const symbols = portfolio.positions.map((pos) => pos.symbol);
            const currentPrices = await fetchMultiplePrices(symbols);
            await portfolio.refreshMarketValues(currentPrices);
            await portfolio.save();

            res.status(200).json({
                success: true,
                data: portfolio.toSnapshotDTO(currentPrices),
                message: `Position ${action.toLowerCase()}ed successfully`,
            });
        } catch (error) {
            next(error);
        }
    },
};
