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
      // Get the auth token from localStorage or authService
      const token = localStorage.getItem("token") || "";

      if (!token) {
        throw new Error("Authentication required to place orders");
      }

      // Convert the order details to the format expected by the calc service
      const tradeData = {
        symbol: orderDetails.symbol,
        qty: orderDetails.quantity,
        side: orderDetails.action.toLowerCase(),
        order_type: orderDetails.source,
        limit_price: orderDetails.limitPrice,
        stop_price: orderDetails.stopPrice,
      };

      // Execute the trade using the calc service
      const result = await calcService.executeTrade(tradeData, token);
      return result;
    } catch (error: any) {
      console.error("Trade execution failed:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to place order"
      );
    }
  },

  async getTradeHistory(token: string) {
    try {
      // This could be extended to fetch trade history from the calc service
      // For now, we'll just return an empty array
      return [];
    } catch (error: any) {
      console.error("Failed to fetch trade history:", error);
      throw new Error("Failed to fetch trade history");
    }
  },
};
