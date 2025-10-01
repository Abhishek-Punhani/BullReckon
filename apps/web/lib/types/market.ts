export interface Candle {
  date: string; // YYYY-MM-DD (matches market_server output)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface StockHistoricalData {
  success?: boolean;
  data?: {
    symbol: string;
    period: string;
    data: Candle[];
  };
  // For backward compatibility
  symbol?: string;
  period?: string;
}

export interface StockQuote {
  success: boolean;
  data: {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    dayHigh: number;
    dayLow: number;
    volume: number;
    marketCap?: number;
    pe?: number;
    name?: string;
    timestamp: string;
  };
  message?: string;
}
