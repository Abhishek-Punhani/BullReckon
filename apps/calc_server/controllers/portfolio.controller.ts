import { Response, NextFunction } from "express";
import { Portfolio, Trade, RiskSettings } from "@repo/models";
import { ErrorHandling } from "../../../middleware/errorHandler";
import { AuthenticatedRequest } from "types/auth";
import { fetchMultiplePrices } from "../utils/fetchPrice";
import { ITrade } from "../types";

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
  /**
   * Get recent trades for dashboard with pagination and filtering
   * GET /api/portfolio/:userId/recent-trades
   */
  getRecentTrades: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.params.userId || req.user?.userId;
      
      // Extract query parameters with defaults
      const {
        page = 1,
        limit = 10,
        symbol,
        action,
        status,
        profitability,
        startDate,
        endDate,
        sortBy = 'executedAt',
        sortOrder = 'desc',
        search
      } = req.query;

      if (!userId) {
        return next(new ErrorHandling("User ID is required", 400));
      }

      // Validate pagination parameters
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(Math.max(1, parseInt(limit as string)), 500); // Max 500 trades per request
      const skip = (pageNum - 1) * limitNum;

      // Build filter query
      const filter: any = { userId };

      // Symbol filter (exact match or search)
      if (symbol && symbol !== 'all') {
        filter.symbol = symbol;
      } else if (search) {
        filter.symbol = { $regex: search, $options: 'i' };
      }

      // Action filter
      if (action && action !== 'all') {
        filter.action = action.toString().toUpperCase();
      }

      // Status filter
      if (status && status !== 'all') {
        filter.status = status;
      }

      // Date range filter
      if (startDate || endDate) {
        filter.executedAt = {};
        if (startDate) {
          filter.executedAt.$gte = new Date(startDate as string);
        }
        if (endDate) {
          filter.executedAt.$lte = new Date(endDate as string);
        }
      }

      // Build sort object
      const sortObj: any = {};
      const validSortFields = ['executedAt', 'symbol', 'action', 'total', 'realizedPnL'];
      const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'executedAt';
      sortObj[sortField as string] = sortOrder === 'asc' ? 1 : -1;

      // Get total count for pagination
      const totalTrades = await Trade.countDocuments(filter);

      // Fetch trades with filters, sorting, and pagination
      const trades = (await Trade.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean()) as (ITrade & { unrealizedPnL?: number | null })[];

      // Calculate unrealized P&L for trades
      const symbols = [...new Set(trades.map((trade) => trade.symbol))];
      const prices = await fetchMultiplePrices(symbols);

      trades.forEach((trade) => {
        const currentPrice = prices[trade.symbol];
        if (
          typeof trade.triggerPrice === "number" &&
          typeof trade.quantity === "number" &&
          typeof trade.action === "string"
        ) {
          if (currentPrice !== undefined) {
            if (trade.action === "BUY") {
              trade.unrealizedPnL =
                (currentPrice - trade.triggerPrice) * trade.quantity;
            } else if (trade.action === "SELL") {
              trade.unrealizedPnL =
                (trade.triggerPrice - currentPrice) * trade.quantity;
            } else {
              trade.unrealizedPnL = 0;
            }
          } else {
            trade.unrealizedPnL = null;
          }
        } else {
          trade.unrealizedPnL = null;
        }
      });

      // Apply profitability filter after calculating unrealized P&L
      let filteredTrades = trades;
      if (profitability && profitability !== 'all') {
        filteredTrades = trades.filter(trade => {
          const pnl = trade.realizedPnL ?? trade.unrealizedPnL ?? 0;
          if (profitability === 'profitable') return pnl > 0;
          if (profitability === 'losing') return pnl < 0;
          return true;
        });
      }

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalTrades / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;

      // Calculate summary statistics for filtered results
      const summary = {
        totalTrades: filteredTrades.length,
        totalVolume: filteredTrades.reduce((sum, trade) => sum + (trade.total || 0), 0),
        totalFees: filteredTrades.reduce((sum, trade) => sum + (trade.fees || 0), 0),
        totalRealizedPnL: filteredTrades.reduce((sum, trade) => sum + (trade.realizedPnL || 0), 0),
        totalUnrealizedPnL: filteredTrades.reduce((sum, trade) => sum + (trade.unrealizedPnL || 0), 0),
        buyTrades: filteredTrades.filter(t => t.action === "BUY").length,
        sellTrades: filteredTrades.filter(t => t.action === "SELL").length,
        profitableTrades: filteredTrades.filter(t => {
          const pnl = t.realizedPnL ?? t.unrealizedPnL ?? 0;
          return pnl > 0;
        }).length,
        uniqueSymbols: [...new Set(filteredTrades.map(t => t.symbol))].length,
      };

      // Calculate win rate
      const winRate = filteredTrades.length > 0 
        ? (summary.profitableTrades / filteredTrades.length) * 100 
        : 0;

      res.status(200).json({
        success: true,
        data: filteredTrades,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalTrades,
          limit: limitNum,
          hasNext,
          hasPrev,
        },
        filters: {
          symbol: symbol || null,
          action: action || null,
          status: status || null,
          profitability: profitability || null,
          startDate: startDate || null,
          endDate: endDate || null,
          search: search || null,
          sortBy: sortField,
          sortOrder,
        },
        summary: {
          ...summary,
          winRate,
        },
        message: "Trades retrieved successfully",
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
  /**
   * Get user's current positions with pagination and filters
   * GET /api/portfolio/:userId/positions?page=1&limit=10&search=AAPL&profitability=profitable&sortBy=unrealizedPnL&sortOrder=desc
   */
  getPositions: async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.params.userId || req.user?.userId;

      if (!userId) {
        return next(new ErrorHandling("User ID is required", 400));
      }

      // Get query parameters
      const {
        page = 1,
        limit = 20,
        search,
        profitability = "all", // all, profitable, losing
        sortBy = "currentValue", // symbol, quantity, avgBuyPrice, currentPrice, totalInvested, currentValue, unrealizedPnL, unrealizedPnLPercentage
        sortOrder = "desc", // asc, desc
        minInvestment,
        maxInvestment,
        minPnL,
        maxPnL,
      } = req.query;

      // Get portfolio from database
      let portfolio = await Portfolio.findOne({ userId });

      if (!portfolio) {
        return res.status(200).json({
          success: true,
          data: {
            positions: [],
            pagination: {
              currentPage: parseInt(page as string),
              totalPages: 0,
              totalCount: 0,
              limit: parseInt(limit as string),
              hasNext: false,
              hasPrev: false,
            },
            summary: {
              totalPositions: 0,
              totalInvested: 0,
              totalCurrentValue: 0,
              totalUnrealizedPnL: 0,
              profitablePositions: 0,
              losingPositions: 0,
              winRate: 0,
              averageReturn: 0,
            },
          },
          message: "No positions found",
        });
      }

      // Extract symbols and fetch current prices
      const symbols = portfolio.positions.map((pos) => pos.symbol);
      const currentPrices = await fetchMultiplePrices(symbols);

      // Refresh market values
      await portfolio.refreshMarketValues(currentPrices);
      await portfolio.save();

      // Create clean positions with current market data
      let cleanPositions = portfolio.positions.map((position: any) => {
        const clean = position._doc || position;
        const currentPrice = currentPrices[clean.symbol] ?? clean.avgBuyPrice;
        const currentValue = clean.quantity * currentPrice;
        const unrealizedPnL = currentValue - clean.totalInvested;
        const unrealizedPnLPercentage =
          clean.totalInvested > 0
            ? (unrealizedPnL / clean.totalInvested) * 100
            : 0;

        return {
          symbol: clean.symbol,
          quantity: clean.quantity,
          avgBuyPrice: clean.avgBuyPrice,
          totalInvested: clean.totalInvested,
          lastUpdated: clean.lastUpdated,
          currentPrice,
          currentValue,
          unrealizedPnL,
          unrealizedPnLPercentage,
        };
      });

      // Apply filters
      if (search) {
        cleanPositions = cleanPositions.filter((pos) =>
          pos.symbol.toLowerCase().includes(search.toString().toLowerCase())
        );
      }

      if (profitability !== "all") {
        cleanPositions = cleanPositions.filter((pos) => {
          if (profitability === "profitable") return pos.unrealizedPnL > 0;
          if (profitability === "losing") return pos.unrealizedPnL < 0;
          return true;
        });
      }

      if (minInvestment) {
        cleanPositions = cleanPositions.filter(
          (pos) => pos.totalInvested >= parseFloat(minInvestment as string)
        );
      }

      if (maxInvestment) {
        cleanPositions = cleanPositions.filter(
          (pos) => pos.totalInvested <= parseFloat(maxInvestment as string)
        );
      }

      if (minPnL) {
        cleanPositions = cleanPositions.filter(
          (pos) => pos.unrealizedPnL >= parseFloat(minPnL as string)
        );
      }

      if (maxPnL) {
        cleanPositions = cleanPositions.filter(
          (pos) => pos.unrealizedPnL <= parseFloat(maxPnL as string)
        );
      }

      // Apply sorting
      cleanPositions.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortBy) {
          case "symbol":
            aValue = a.symbol;
            bValue = b.symbol;
            return sortOrder === "asc"
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);
          case "quantity":
            aValue = a.quantity;
            bValue = b.quantity;
            break;
          case "avgBuyPrice":
            aValue = a.avgBuyPrice;
            bValue = b.avgBuyPrice;
            break;
          case "currentPrice":
            aValue = a.currentPrice;
            bValue = b.currentPrice;
            break;
          case "totalInvested":
            aValue = a.totalInvested;
            bValue = b.totalInvested;
            break;
          case "currentValue":
            aValue = a.currentValue;
            bValue = b.currentValue;
            break;
          case "unrealizedPnL":
            aValue = a.unrealizedPnL;
            bValue = b.unrealizedPnL;
            break;
          case "unrealizedPnLPercentage":
            aValue = a.unrealizedPnLPercentage;
            bValue = b.unrealizedPnLPercentage;
            break;
          default:
            aValue = a.currentValue;
            bValue = b.currentValue;
        }

        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      });

      // Calculate summary statistics for all filtered positions
      const totalPositions = cleanPositions.length;
      const totalInvested = cleanPositions.reduce(
        (sum, pos) => sum + pos.totalInvested,
        0
      );
      const totalCurrentValue = cleanPositions.reduce(
        (sum, pos) => sum + pos.currentValue,
        0
      );
      const totalUnrealizedPnL = cleanPositions.reduce(
        (sum, pos) => sum + pos.unrealizedPnL,
        0
      );
      const profitablePositions = cleanPositions.filter(
        (pos) => pos.unrealizedPnL > 0
      ).length;
      const losingPositions = cleanPositions.filter(
        (pos) => pos.unrealizedPnL < 0
      ).length;

      // Apply pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const totalCount = cleanPositions.length;
      const totalPages = Math.ceil(totalCount / limitNum);
      const skip = (pageNum - 1) * limitNum;

      const paginatedPositions = cleanPositions.slice(skip, skip + limitNum);

      res.status(200).json({
        success: true,
        data: {
          positions: paginatedPositions,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalCount,
            limit: limitNum,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1,
          },
          summary: {
            totalPositions,
            totalInvested,
            totalCurrentValue,
            totalUnrealizedPnL,
            profitablePositions,
            losingPositions,
            winRate:
              totalPositions > 0
                ? (profitablePositions / totalPositions) * 100
                : 0,
            averageReturn:
              totalInvested > 0
                ? (totalUnrealizedPnL / totalInvested) * 100
                : 0,
          },
        },
        message: "Positions retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  },
};
