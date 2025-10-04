import api from "@/lib/api";
import { API_CONFIG } from "../lib/config";

export const calcService = {
  async getRiskSettings() {
    const response = await api.get(
      `${API_CONFIG.CALC_SERVER}/api/risk-settings/`
    );
    return response.data;
  },

  async updateRiskSettings(settings: object) {
    const response = await api.post(
      `${API_CONFIG.CALC_SERVER}/api/risk-settings/`,
      settings
    );
    return response.data;
  },

  async executeTrade(tradeData: object) {
    const response = await api.post(
      `${API_CONFIG.CALC_SERVER}/api/trades`,
      tradeData
    );
    return response.data;
  },
};
