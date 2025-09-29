export interface Candle {
  date: string; // YYYY-MM-DD (matches market_server output)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface StockHistoricalData {
  symbol: string;
  period: string;
  data: Candle[];
}