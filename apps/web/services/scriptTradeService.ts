import api from "@/lib/api";
import { API_CONFIG } from "../config";

export interface ScriptTradeInfo {
  tradeId: string;
  confidence?: number;
  reason?: string;
  trade?: {
    _id: string;
    symbol: string;
    action: string;
    quantity: number;
    triggerPrice: number;
    status: string;
    executedAt?: string;
    fees: number;
    total: number;
    source: string;
    realizedPnL?: number;
  };
}

export interface ScriptWithTrades {
  _id: string;
  scriptName: string;
  userId: string;
  trades: ScriptTradeInfo[];
}

export const scriptTradeService = {
  async getAllScriptTrades(): Promise<{
    scripts: ScriptWithTrades[];
    total: number;
  }> {
    const response = await api.get(
      `${API_CONFIG.CALC_SERVER}/api/script-trades/`
    );
    return response.data;
  },

  async getScriptTradesByName(scriptName: string) {
    const response = await api.get(
      `${API_CONFIG.CALC_SERVER}/api/script-trades/${encodeURIComponent(scriptName)}`
    );
    return response.data;
  },
};
