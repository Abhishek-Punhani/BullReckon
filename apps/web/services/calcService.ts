import axios from "axios";
import { API_CONFIG } from "../lib/config";

export const calcService = {
  async getRiskSettings( token: string) {
    const response = await axios.get(
      `${API_CONFIG.CALC_SERVER}/api/risk-settings/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  async updateRiskSettings(settings: any, token: string) {
    const response = await axios.post(
      `${API_CONFIG.CALC_SERVER}/api/risk-settings/`,
      settings,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  async executeTrade(tradeData: any, token: string) {
    const response = await axios.post(
      `${API_CONFIG.CALC_SERVER}/api/trades`,
      tradeData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};