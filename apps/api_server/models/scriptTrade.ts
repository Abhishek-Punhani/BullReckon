// This file exists for reference only
// The actual ScriptTrade functionality is handled by calc_server
// API requests are forwarded to calc_server via internal API

export interface ScriptTradeReference {
  _id: string;
  userId: string;
  scriptName: string;
  trades: Array<{
    tradeId: string;
    confidence?: number;
    reason?: string;
  }>;
}

// Note: This is not a Mongoose model - just a TypeScript interface
// The actual model and database operations are in calc_server
