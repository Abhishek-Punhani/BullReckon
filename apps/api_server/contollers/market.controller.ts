import { Response, NextFunction, Request } from "express";
import { ErrorHandling } from "../../../middleware/errorHandler";
import axios from "axios";
import { internalApi } from "../../../shared/internalApi.client";

const MARKET_SERVER_URL =
  process.env.MARKET_SERVER_URL || "http://localhost:5000";
const CALC_SERVER_URL = process.env.CALC_SERVER_URL || "http://localhost:8000";

// Extend Request interface to include apiUser
interface ApiAuthenticatedRequest extends Request {
  apiUser?: {
    email: string;
    keyId: string;
  };
}

export const marketController = {
  // Get stock quote
  getQuote: async (
    req: ApiAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { symbol } = req.params;

      if (!symbol) {
        return next(new ErrorHandling("Symbol is required", 400));
      }

      const response = await axios.get(
        `${MARKET_SERVER_URL}/api/market/quote/${symbol}`
      );

      res.json({
        success: true,
        data: response.data,
        requestedBy: req.apiUser?.email,
      });
    } catch (error: any) {
      console.error("Error fetching quote:", error);
      if (error.response) {
        return next(
          new ErrorHandling(
            error.response.data.message || "Failed to fetch quote",
            error.response.status
          )
        );
      }
      next(new ErrorHandling("Failed to fetch market data", 500));
    }
  },

  // Get historical data
  getHistoricalData: async (
    req: ApiAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { symbol } = req.params;
      const { period, interval, start, end } = req.query;

      if (!symbol) {
        return next(new ErrorHandling("Symbol is required", 400));
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (period) queryParams.set("period", period as string);
      if (interval) queryParams.set("interval", interval as string);
      if (start) queryParams.set("start", start as string);
      if (end) queryParams.set("end", end as string);

      const queryString = queryParams.toString();
      const url = `${MARKET_SERVER_URL}/api/market/historical/${symbol}${queryString ? `?${queryString}` : ""}`;

      const response = await axios.get(url);

      res.json({
        success: true,
        data: response.data,
        requestedBy: req.apiUser?.email,
        format: response.data.format || "legacy",
      });
    } catch (error: any) {
      console.error("Error fetching historical data:", error);
      if (error.response) {
        return next(
          new ErrorHandling(
            error.response.data.message || "Failed to fetch historical data",
            error.response.status
          )
        );
      }
      next(new ErrorHandling("Failed to fetch historical data", 500));
    }
  },

  // Get company info
  getCompanyInfo: async (
    req: ApiAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { symbol } = req.params;

      if (!symbol) {
        return next(new ErrorHandling("Symbol is required", 400));
      }

      const response = await axios.get(
        `${MARKET_SERVER_URL}/api/market/company/${symbol}`
      );

      res.json({
        success: true,
        data: response.data,
        requestedBy: req.apiUser?.email,
      });
    } catch (error: any) {
      console.error("Error fetching company info:", error);
      if (error.response) {
        return next(
          new ErrorHandling(
            error.response.data.message || "Failed to fetch company info",
            error.response.status
          )
        );
      }
      next(new ErrorHandling("Failed to fetch company info", 500));
    }
  },
};

export const tradingController = {
  // Execute buy/sell trade
  executeTrade: async (
    req: ApiAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const {
        symbol,
        action,
        quantity,
        price,
        scriptName,
        confidence,
        source,
        reason,
      } = req.body;

      if (!scriptName) {
        return next(
          new ErrorHandling("Project name (scriptName) not specified", 400)
        );
      }
      if (!symbol || !action || !quantity || !source) {
        return next(
          new ErrorHandling("Symbol, action, source and quantity are required", 400)
        );
      }
      if (!["BUY", "SELL"].includes(action.toUpperCase())) {
        return next(new ErrorHandling("Action must be BUY or SELL", 400));
      }
      if (!req.apiUser) {
        return next(new ErrorHandling("API authentication required", 401));
      }

      // Forward the trade request to calc server using internal route
      const tradeData = {
        symbol,
        action: action.toUpperCase(),
        quantity: Number(quantity),
        price: price ? Number(price) : undefined,
        userEmail: req.apiUser.email,
        apiKeyId: req.apiUser.keyId,
        scriptName,
        confidence,
        source,
        reason,
      };

      const response = await internalApi.post(
        `${CALC_SERVER_URL}/api/trades/internal`,
        tradeData,
        {
          headers: {
            "X-API-Email": req.apiUser.email,
          },
        }
      );
      res.json({
        success: true,
        message: `${action.toUpperCase()} order executed successfully`,
        data: response.data,
        executedBy: req.apiUser.email,
      });
    } catch (error: any) {
      console.error("Error executing trade:", error);
      if (error.response) {
        return next(
          new ErrorHandling(
            error.response.data.message || "Failed to execute trade",
            error.response.status
          )
        );
      }
      next(new ErrorHandling("Failed to execute trade", 500));
    }
  },
};
