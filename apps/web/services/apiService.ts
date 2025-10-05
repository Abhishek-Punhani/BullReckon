import axios from "axios";
import { API_CONFIG } from "../config";

export const apiService = {
  async getPortfolio(userId: string, token: string) {
    const response = await axios.get(
      `${API_CONFIG.API_SERVER}/api/portfolio/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  async getTradeHistory(userId: string, token: string) {
    const response = await axios.get(
      `${API_CONFIG.API_SERVER}/api/trades/history/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};
