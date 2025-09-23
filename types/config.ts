export interface BaseConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DB_URL: string;
  SESSION_SECRET: string;
  CLIENT_URL: string;
  JWT_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
}

export interface AuthConfig extends BaseConfig {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export interface TradingConfig extends BaseConfig {
  MARKET_DATA_API_URL: string;
  REDIS_URL: string;
}

export interface BacktestConfig extends BaseConfig {
  MAX_BACKTEST_DURATION_DAYS: number;
  WORKER_CONCURRENCY: number;
}

