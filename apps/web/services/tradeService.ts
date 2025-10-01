import { calcService } from "./calcService";
import { authService } from "./authService";

interface OrderDetails {
  symbol: string;
  quantity: number;
  action: string;
  source: string;
  limitPrice?: number;
  stopPrice?: number;
}

export const tradeService = {
  async placeOrder(orderDetails: OrderDetails) {
    try {
      const token = await authService.getToken();

      if (!token) {
        throw new Error("Authentication required to place orders");
      }

      const tradeData: {
        symbol: string;
        quantity: number;
        action: string;
        source: string;
        limitPrice?: number;
        stopPrice?: number;
      } = {
        symbol: orderDetails.symbol,
        quantity: orderDetails.quantity,
        action: orderDetails.action.toUpperCase(), // Backend expects uppercase BUY/SELL
        source: orderDetails.source,
      };

      // Only include limitPrice if source is 'limit' and it's defined
      if (
        orderDetails.source === "limit" &&
        orderDetails.limitPrice !== undefined
      ) {
        tradeData.limitPrice = orderDetails.limitPrice;
      }

      // Only include stopPrice if source is 'stop_loss' or 'take_profit' and it's defined
      if (
        (orderDetails.source === "stop_loss" ||
          orderDetails.source === "take_profit") &&
        orderDetails.stopPrice !== undefined
      ) {
        tradeData.stopPrice = orderDetails.stopPrice;
      }

      const result = await calcService.executeTrade(tradeData, token);
      return result;
    } catch (error) {
      console.error("Trade execution failed:", error);
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : "Failed to place order";
      throw new Error(errorMessage);
    }
  },

  async getTradeHistory() {
    try {
      // This could be extended to fetch trade history from the calc service
      // For now, we'll just return an empty array
      return [];
    } catch (error) {
      console.error("Failed to fetch trade history:", error);
      throw new Error("Failed to fetch trade history");
    }
  },
};
