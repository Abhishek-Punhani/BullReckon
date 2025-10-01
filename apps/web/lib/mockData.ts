// Mock data for the trading platform

export interface OHLCData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  avg_buy_price: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_percentage: number;
}

export interface TradeHistory {
  id: string;
  timestamp: string;
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  price: number;
  fees: number;
  pnl: number;
}

export interface User {
  id: string;
  email: string;
  password: string;
  balance: number;
  total_equity: number;
}

export interface Portfolio {
  cash: number;
  positions: Position[];
  total_value: number;
  total_pnl: number;
  total_pnl_percentage: number;
}

export interface RiskSettings {
  stop_loss: number;
  take_profit: number;
  max_drawdown: number;
  capital_allocation: number;
}

export interface BacktestResult {
  total_return: number;
  max_drawdown: number;
  sharpe_ratio: number;
  win_rate: number;
  trades: TradeHistory[];
}

export interface Competition {
  id: string;
  name: string;
  participants: number;
  prize_pool: number;
  start_date: string;
  end_date: string;
  status: "upcoming" | "active" | "completed";
}

export interface LeaderboardEntry {
  rank: number;
  user: string;
  roi: number;
  trades: number;
  pnl: number;
}

// Mock Users
export const mockUsers: User[] = [
  {
    id: "1",
    email: "trader@example.com",
    password: "password123",
    balance: 100000,
    total_equity: 112500,
  },
  {
    id: "2",
    email: "demo@trading.com",
    password: "demo123",
    balance: 50000,
    total_equity: 48750,
  },
];

// Mock Market Data
export const generateMockOHLCData = (
  symbol: string,
  days: number = 30
): OHLCData[] => {
  const data: OHLCData[] = [];
  const basePrice =
    symbol === "BTCUSDT"
      ? 50000
      : symbol === "ETHUSDT"
        ? 1800
        : symbol === "AAPL"
          ? 150
          : 200;
  let currentPrice = basePrice;

  // Generate data from oldest to newest (ascending time order)
  for (let i = days; i >= 0; i--) {
    const timestamp = new Date(
      Date.now() - i * 24 * 60 * 60 * 1000
    ).toISOString();

    // Random price movement
    const change = (Math.random() - 0.5) * 0.1; // ±5% daily volatility
    const open = currentPrice;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = Math.floor(Math.random() * 1000) + 100;

    data.push({
      timestamp,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    currentPrice = close;
  }

  // Data is already in ascending chronological order, no need to reverse
  return data;
};

// Mock Portfolio
export const mockPortfolio: Portfolio = {
  cash: 50000,
  positions: [
    {
      symbol: "BTCUSDT",
      quantity: 1.5,
      avg_buy_price: 50000,
      current_price: 50500,
      unrealized_pnl: 750,
      unrealized_pnl_percentage: 1.5,
    },
    {
      symbol: "ETHUSDT",
      quantity: 10,
      avg_buy_price: 1800,
      current_price: 1900,
      unrealized_pnl: 1000,
      unrealized_pnl_percentage: 5.56,
    },
    {
      symbol: "AAPL",
      quantity: 50,
      avg_buy_price: 150,
      current_price: 145,
      unrealized_pnl: -250,
      unrealized_pnl_percentage: -3.33,
    },
  ],
  total_value: 112500,
  total_pnl: 1500,
  total_pnl_percentage: 1.35,
};

// Mock Trade History
export const mockTradeHistory: TradeHistory[] = [
  {
    id: "1",
    timestamp: "2025-09-23T14:00:00Z",
    symbol: "BTCUSDT",
    action: "BUY",
    quantity: 1,
    price: 50000,
    fees: 5,
    pnl: 0,
  },
  {
    id: "2",
    timestamp: "2025-09-23T15:00:00Z",
    symbol: "BTCUSDT",
    action: "BUY",
    quantity: 0.5,
    price: 50200,
    fees: 2.5,
    pnl: 0,
  },
  {
    id: "3",
    timestamp: "2025-09-22T10:30:00Z",
    symbol: "ETHUSDT",
    action: "BUY",
    quantity: 10,
    price: 1800,
    fees: 18,
    pnl: 0,
  },
  {
    id: "4",
    timestamp: "2025-09-21T16:45:00Z",
    symbol: "AAPL",
    action: "BUY",
    quantity: 50,
    price: 150,
    fees: 7.5,
    pnl: 0,
  },
];

// Mock Risk Settings
export const mockRiskSettings: RiskSettings = {
  stop_loss: 5,
  take_profit: 10,
  max_drawdown: 20,
  capital_allocation: 25,
};

// Mock Competitions
export const mockCompetitions: Competition[] = [
  {
    id: "1",
    name: "Weekly Championship",
    participants: 1247,
    prize_pool: 50000,
    start_date: "2025-09-23T00:00:00Z",
    end_date: "2025-09-30T23:59:59Z",
    status: "active",
  },
  {
    id: "2",
    name: "Crypto Masters",
    participants: 891,
    prize_pool: 25000,
    start_date: "2025-10-01T00:00:00Z",
    end_date: "2025-10-07T23:59:59Z",
    status: "upcoming",
  },
];

// Mock Leaderboard
export const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, user: "CryptoKing", roi: 24.7, trades: 156, pnl: 12350 },
  { rank: 2, user: "TradeMaster", roi: 18.3, trades: 89, pnl: 9150 },
  { rank: 3, user: "BullRunner", roi: 15.9, trades: 234, pnl: 7950 },
  { rank: 4, user: "WaveRider", roi: 12.1, trades: 67, pnl: 6050 },
  { rank: 5, user: "MarketSage", roi: 10.8, trades: 145, pnl: 5400 },
];

// Mock Backtest Result
export const mockBacktestResult: BacktestResult = {
  total_return: 12.5,
  max_drawdown: 8.2,
  sharpe_ratio: 1.3,
  win_rate: 67.5,
  trades: [
    {
      id: "bt1",
      timestamp: "2023-01-05T10:00:00Z",
      symbol: "BTCUSDT",
      action: "BUY",
      quantity: 1,
      price: 20000,
      fees: 20,
      pnl: 0,
    },
    {
      id: "bt2",
      timestamp: "2023-02-10T15:00:00Z",
      symbol: "BTCUSDT",
      action: "SELL",
      quantity: 1,
      price: 22000,
      fees: 22,
      pnl: 1958,
    },
  ],
};

// Market symbols
export const SYMBOLS = [
  { value: "BTCUSDT", label: "Bitcoin", icon: "₿" },
  { value: "ETHUSDT", label: "Ethereum", icon: "Ξ" },
  { value: "AAPL", label: "Apple Inc.", icon: "🍎" },
  { value: "TSLA", label: "Tesla Inc.", icon: "🚗" },
  { value: "GOOGL", label: "Google", icon: "🔍" },
  { value: "MSFT", label: "Microsoft", icon: "🪟" },
];

// Technical indicators
export const INDICATORS = [
  { value: "rsi", label: "RSI" },
  { value: "ema", label: "EMA" },
  { value: "macd", label: "MACD" },
  { value: "bollinger", label: "Bollinger Bands" },
  { value: "volume", label: "Volume" },
];

// Market categories
export interface MarketAsset {
  value: string;
  label: string;
  icon: string;
  description: string;
}

export const MARKET_CATEGORIES: Record<string, MarketAsset[]> = {
  indices: [
    {
      value: "^GSPC",
      label: "S&P 500",
      icon: "🏛️",
      description: "US large-cap stock market index",
    },
    {
      value: "^IXIC",
      label: "NASDAQ Composite",
      icon: "📈",
      description: "Technology-heavy stock market index",
    },
    {
      value: "^DJI",
      label: "Dow Jones",
      icon: "📊",
      description: "US blue-chip stock market index",
    },
    {
      value: "^VIX",
      label: "VIX",
      icon: "⚡",
      description: "Market volatility index",
    },
  ],
  stocks: [
    {
      value: "AAPL",
      label: "Apple Inc.",
      icon: "🍎",
      description: "Technology hardware and software",
    },
    {
      value: "MSFT",
      label: "Microsoft",
      icon: "🪟",
      description: "Cloud computing and software",
    },
    {
      value: "GOOGL",
      label: "Alphabet Inc.",
      icon: "🔍",
      description: "Internet services and advertising",
    },
    {
      value: "AMZN",
      label: "Amazon",
      icon: "📦",
      description: "E-commerce and cloud services",
    },
    {
      value: "TSLA",
      label: "Tesla",
      icon: "🚗",
      description: "Electric vehicles and clean energy",
    },
    {
      value: "NVDA",
      label: "NVIDIA",
      icon: "🎮",
      description: "Graphics processing and AI chips",
    },
  ],
  crypto: [
    {
      value: "BTC-USD",
      label: "Bitcoin",
      icon: "₿",
      description: "Digital gold and store of value",
    },
    {
      value: "ETH-USD",
      label: "Ethereum",
      icon: "Ξ",
      description: "Smart contracts and DeFi platform",
    },
  ],
  commodities: [
    {
      value: "GC=F",
      label: "Gold",
      icon: "🥇",
      description: "Precious metal commodity",
    },
    {
      value: "SI=F",
      label: "Silver",
      icon: "🥈",
      description: "Precious metal commodity",
    },
    {
      value: "CL=F",
      label: "Crude Oil",
      icon: "🛢️",
      description: "Energy commodity",
    },
  ],
};
