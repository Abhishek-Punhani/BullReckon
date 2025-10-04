import { Request, Response, NextFunction } from "express";
import { marketService } from "../services/marketService";
import { ErrorHandling } from "../../../middleware/errorHandler";

/**
 * Get real-time stock quote
 * GET /api/market/quote/:symbol
 */
export const getStockQuote = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return next(new ErrorHandling("Stock symbol is required", 400));
    }

    const quote = await marketService.getStockQuote(symbol);

    res.status(200).json({
      success: true,
      data: quote,
      message: `Stock quote retrieved for ${symbol.toUpperCase()}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get historical stock data
 * GET /api/market/historical/:symbol?period=1mo
 * OR for backtest compatibility:
 * GET /api/market/historical/:symbol?interval=1h&start=2023-01-01T00:00:00Z&end=2023-12-31T23:59:59Z
 */
export const getHistoricalData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { symbol } = req.params;
    const { period, interval, start, end } = req.query;

    if (!symbol) {
      return next(new ErrorHandling("Stock symbol is required", 400));
    }

    // Check if this is a backtest format request
    if (interval && start && end) {
      // Backtest format validation
      const validIntervals = ["1m", "5m", "15m", "30m", "1h", "1d"];
      if (!validIntervals.includes(interval as string)) {
        return next(
          new ErrorHandling(
            `Invalid interval. Valid intervals: ${validIntervals.join(", ")}`,
            400
          )
        );
      }

      // Validate ISO date strings
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return next(
          new ErrorHandling(
            "Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)",
            400
          )
        );
      }

      if (startDate >= endDate) {
        return next(
          new ErrorHandling("Start date must be before end date", 400)
        );
      }

      // Call service with backtest format
      const historicalData = await marketService.getHistoricalDataForBacktest(
        symbol,
        interval as string,
        startDate,
        endDate
      );

      return res.status(200).json({
        success: true,
        data: historicalData,
        message: `Backtest historical data retrieved for ${symbol.toUpperCase()}`,
        format: "backtest",
      });
    }

    // Legacy format handling
    const validPeriods = [
      "1d",
      "5d",
      "1mo",
      "3mo",
      "6mo",
      "1y",
      "2y",
      "5y",
      "10y",
      "ytd",
      "max",
    ];

    const requestedPeriod = (period as string) || "1mo";
    if (!validPeriods.includes(requestedPeriod)) {
      return next(
        new ErrorHandling(
          `Invalid period. Valid periods: ${validPeriods.join(", ")}`,
          400
        )
      );
    }

    const historicalData = await marketService.getHistoricalData(
      symbol,
      requestedPeriod as
        | "1d"
        | "5d"
        | "1mo"
        | "3mo"
        | "6mo"
        | "1y"
        | "2y"
        | "5y"
        | "10y"
        | "ytd"
        | "max"
    );

    res.status(200).json({
      success: true,
      data: historicalData,
      message: `Historical data retrieved for ${symbol.toUpperCase()}`,
      format: "legacy",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search for stocks
 * GET /api/market/search?q=apple
 */
export const searchStocks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { q: query } = req.query;

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return next(
        new ErrorHandling(
          "Search query must be at least 2 characters long",
          400
        )
      );
    }

    const results = await marketService.searchStocks(query.trim());

    res.status(200).json({
      success: true,
      data: results,
      message: `Search results for "${query}"`,
      count: results.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get multiple stock quotes
 * POST /api/market/quotes
 * Body: { symbols: ["AAPL", "GOOGL", "MSFT"] }
 */
export const getMultipleQuotes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { symbols } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return next(new ErrorHandling("Array of stock symbols is required", 400));
    }

    if (symbols.length > 20) {
      return next(
        new ErrorHandling("Maximum 20 symbols allowed per request", 400)
      );
    }

    // Validate all symbols are strings
    if (!symbols.every((symbol) => typeof symbol === "string")) {
      return next(new ErrorHandling("All symbols must be strings", 400));
    }

    const quotes = await marketService.getMultipleQuotes(symbols);

    res.status(200).json({
      success: true,
      data: quotes,
      message: `Retrieved quotes for ${quotes.length} out of ${symbols.length} symbols`,
      requested: symbols,
      found: quotes.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get market service statistics (cache info, etc.)
 * GET /api/market/stats
 */
export const getMarketStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const cacheStats = marketService.getCacheStats();

    res.status(200).json({
      success: true,
      data: {
        cache: cacheStats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      },
      message: "Market service statistics retrieved",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear market service cache
 * DELETE /api/market/cache
 */
export const clearCache = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    marketService.clearCache();

    res.status(200).json({
      success: true,
      message: "Market service cache cleared successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get company information
 * GET /api/market/company/:symbol
 */
export const getCompanyInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return next(new ErrorHandling("Stock symbol is required", 400));
    }

    const companyInfo = await marketService.getCompanyInfo(symbol);

    res.status(200).json({
      success: true,
      data: companyInfo,
      message: `Company information retrieved for ${symbol.toUpperCase()}`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get live prices for long polling
 * GET /api/market/long-poll/prices?symbols=AAPL,GOOGL&lastUpdate=1234567890
 */
export const getLivePrice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { symbols, lastUpdate } = req.query;

    // Validate symbols parameter
    if (!symbols || typeof symbols !== "string") {
      return next(
        new ErrorHandling(
          "Symbols parameter is required (comma-separated string)",
          400
        )
      );
    }

    // Parse symbols
    const symbolArray = symbols
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);

    if (symbolArray.length === 0) {
      return next(
        new ErrorHandling("At least one valid symbol is required", 400)
      );
    }

    if (symbolArray.length > 50) {
      return next(
        new ErrorHandling("Maximum 50 symbols allowed per request", 400)
      );
    }

    // Parse lastUpdate timestamp
    const lastUpdateTime =
      lastUpdate && typeof lastUpdate === "string"
        ? parseInt(lastUpdate, 10)
        : 0;

    // Get live prices
    const result = await marketService.getLivePrices(
      symbolArray,
      lastUpdateTime
    );

    res.status(200).json({
      success: true,
      data: result.prices,
      timestamp: result.timestamp,
      hasUpdates: result.hasUpdates,
      message: `Live prices retrieved for ${Object.keys(result.prices).length} symbols`,
    });
  } catch (error) {
    next(error);
  }
};
