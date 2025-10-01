import { calcService } from "./calcService";
import { authService } from "./authService";

const tradeService = {
  async placeOrder(order: any) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error("No authentication token found");
      }
      const response = await calcService.executeTrade(order, token);
      return response;
    } catch (error) {
      console.error("Error placing order:", error);
      throw error;
    }
  },
};

export default tradeService;
