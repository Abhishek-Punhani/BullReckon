import api from "@/lib/api";
import { API_CONFIG } from "../config";

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

  async toggleRiskMonitoring(enabled: boolean) {
    const response = await api.post(
      `${API_CONFIG.CALC_SERVER}/api/risk-settings/toggle`,
      { enabled }
    );
    return response.data;
  },

  async getRiskHistory(params?: {
    limit?: number;
    symbol?: string;
    action?: string;
  }) {
    const response = await api.get(
      `${API_CONFIG.CALC_SERVER}/api/risk-settings/history`,
      { params }
    );
    return response.data;
  },

  async getMonitoringStatus() {
    const response = await api.get(
      `${API_CONFIG.CALC_SERVER}/api/risk-settings/monitoring-status`
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
