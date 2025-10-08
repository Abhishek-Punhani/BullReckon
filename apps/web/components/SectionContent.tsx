import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Key, TrendingUp, Zap, ArrowRight } from "lucide-react";
import CodeBlock from "./CodeBlock";
import {
  pythonAuthCode,
  jsAuthCode,
  goAuthCode,
  curlAuthCode,
  pythonBotCode,
  goBotCode,
  pythonBacktestCode,
  goBacktestCode,
} from "../codes/codeExamples";

interface SectionContentProps {
  activeSection: string;
  handleSectionChange: (id: string) => void;
}

const SectionContent: React.FC<SectionContentProps> = ({
  activeSection,
  handleSectionChange,
}) => {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">BullReckon API</h1>
        <p className="text-muted-foreground text-lg">
          Build powerful algorithmic trading strategies with our comprehensive
          API
        </p>
      </div>

      {/* Getting Started */}
      {activeSection === "getting-started" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Quick Start Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  1. Sign Up & Get API Keys
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Create an account on BullReckon and navigate to the{" "}
                  <Link
                    href="/strategy"
                    className="text-primary hover:underline"
                  >
                    Strategy Dashboard
                  </Link>
                  .
                </p>
                <p className="text-sm text-muted-foreground">
                  Click on &quot;Generate API Key&quot; to create your
                  authentication credentials.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">2. Choose Your Approach</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <TrendingUp className="h-8 w-8 mb-2 text-primary" />
                      <h4 className="font-semibold mb-2">
                        Programmatic Trading
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Write custom strategies in Python, JavaScript, Go, or
                        any language
                      </p>
                      <button
                        onClick={() => handleSectionChange("algo-trading")}
                        className="text-primary text-sm hover:underline"
                      >
                        View API Docs →
                      </button>
                    </CardContent>
                  </Card>
                  <Card className="border-2">
                    <CardContent className="pt-6">
                      <Zap className="h-8 w-8 mb-2 text-primary" />
                      <h4 className="font-semibold mb-2">No-Code Builder</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Visual strategy builder with form-based interface
                      </p>
                      <button
                        onClick={() => handleSectionChange("no-code-builder")}
                        className="text-primary text-sm hover:underline"
                      >
                        Learn More →
                      </button>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">3. Test with Backtesting</h3>
                <p className="text-sm text-muted-foreground">
                  Validate your strategies with historical data before deploying
                  live.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Base URL</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock
                codes={{ URL: `${process.env.NEXT_PUBLIC_API_SERVER_URL}` }}
                defaultLanguage="URL"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Authentication */}
      {activeSection === "authentication" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                All API requests require authentication using RSA key pairs.
                You&apos;ll need to include specific headers in every request.
              </p>
              <div>
                <h3 className="font-semibold mb-2">Required Headers</h3>
                <div className="space-y-2">
                  <div className="bg-muted p-3 rounded-lg">
                    <code className="text-sm">x-api-email</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your registered email address
                    </p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <code className="text-sm">x-api-key</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your public API key (PEM format)
                    </p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <code className="text-sm">x-api-timestamp</code>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current Unix timestamp in milliseconds
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Code Examples</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock
                codes={{
                  Python: pythonAuthCode,
                  JavaScript: jsAuthCode,
                  Go: goAuthCode,
                  bash: curlAuthCode,
                }}
                defaultLanguage="Python"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Algorithmic Trading */}
      {activeSection === "algo-trading" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Algorithmic Trading API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground mb-2">
                The BullReckon API enables you to automate trading strategies,
                manage orders, and access real-time market data. You can build
                bots in Python, Go, JavaScript, or any language that supports
                HTTP requests.
              </p>
              <h3 className="font-semibold mb-2">Key Concepts</h3>
              <ul className="list-disc ml-6 text-sm text-muted-foreground mb-2">
                <li>
                  All endpoints require authentication headers as described
                  above.
                </li>
                <li>Rate limits apply: 60 requests/minute per API key.</li>
                <li>All requests and responses use JSON format.</li>
                <li>Order types: market, limit, stop, OCO.</li>
                <li>Supported assets: equities, crypto, forex, and more.</li>
              </ul>
              <h3 className="font-semibold mb-2">Typical Workflow</h3>
              <ol className="list-decimal ml-6 text-sm text-muted-foreground mb-2">
                <li>Authenticate and connect to the API.</li>
                <li>Fetch account and market data.</li>
                <li>Submit orders and monitor execution status.</li>
                <li>Handle errors and implement risk management.</li>
              </ol>
              <h3 className="font-semibold mb-2">Best Practices</h3>
              <ul className="list-disc ml-6 text-sm text-muted-foreground mb-2">
                <li>Always validate order parameters before submitting.</li>
                <li>
                  Implement error handling and retry logic for network issues.
                </li>
                <li>
                  Use backtesting to validate strategies before live trading.
                </li>
                <li>
                  Monitor API status and subscribe to webhooks for real-time
                  updates.
                </li>
              </ul>
            </CardContent>
          </Card>
          {/* Fetching Live Prices */}
          <Card className="border-2">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-xl">Fetching Live Prices</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Fetch real-time stock prices using the market quote endpoint.
                  Make sure to set the authentication headers correctly as
                  described in the Authentication section.
                </p>

                <div className="bg-slate-950 p-6 rounded-lg border">
                  <pre className="text-sm text-slate-50 font-mono overflow-x-auto">
                    {`def fetch_stock_price(symbol):
    endpoint = f"{API_URL}/market/quote/{symbol}"
    response = requests.get(endpoint, headers=HEADERS)
    return response.json()`}
                  </pre>
                </div>

                <p className="text-sm text-muted-foreground">
                  Response format:
                </p>

                <div className="bg-slate-950 p-6 rounded-lg border">
                  <pre className="text-sm text-slate-50 font-mono overflow-x-auto">
                    {`{
  "success": true,
  "data": {
    "success": true,
    "data": {
      "symbol": "AAPL",
      "price": 257.84,
      "change": 1.3599854,
      "changePercent": 0.53025,
      "dayHigh": 258.52,
      "dayLow": 256.11,
      "volume": 17073976,
      "marketCap": 3826445975552,
      "pe": 39.125946,
      "timestamp": "2025-10-08T17:07:12.906Z"
    },
    "message": "Stock quote retrieved for AAPL"
  },
  "requestedBy": "punhaniabhishek17@gmail.com"
}`}
                  </pre>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Key Fields</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                        symbol
                      </code>
                      <span>Stock ticker symbol</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                        price
                      </code>
                      <span>Current stock price</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                        change
                      </code>
                      <span>Price change from previous close</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                        changePercent
                      </code>
                      <span>Percentage change</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Strategy Endpoint Documentation */}
          <Card className="border-2">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-xl">
                Strategy Endpoint Format
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Your strategy endpoint should return JSON in the following
                  format:
                </p>

                <div className="bg-slate-950 p-6 rounded-lg border">
                  <pre className="text-sm text-slate-50 font-mono overflow-x-auto">
                    {`{
  "action": "BUY" | "SELL" | "HOLD",
  "symbol": "BTCUSDT",
  "quantity": 0.5,
  "confidence": 85,
  "reason": "Golden cross detected"
}`}
                  </pre>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary"></div>
                      Required Fields
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          action
                        </code>
                        <span>BUY, SELL, or HOLD</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          symbol
                        </code>
                        <span>Trading pair (e.g., BTCUSDT)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          quantity
                        </code>
                        <span>Amount to trade</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-muted-foreground"></div>
                      Optional Fields
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          confidence
                        </code>
                        <span>Signal strength (0-100)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          reason
                        </code>
                        <span>Human-readable explanation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          price
                        </code>
                        <span>Suggested execution price</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Complete Trading Bot Example</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock
                codes={{
                  Python: pythonBotCode,
                  Go: goBotCode,
                }}
                defaultLanguage="Python"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Backtesting */}
      {activeSection === "backtesting" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Backtesting API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground mb-2">
                Backtesting lets you simulate your trading strategies on
                historical data to evaluate performance before risking real
                capital. The API supports custom time ranges, asset selection,
                and strategy parameters.
              </p>
              <h3 className="font-semibold mb-2">How It Works</h3>
              <ol className="list-decimal ml-6 text-sm text-muted-foreground mb-2">
                <li>
                  Submit your strategy code and parameters to the backtest
                  endpoint.
                </li>
                <li>Specify the asset, time range, and initial capital.</li>
                <li>
                  Receive a detailed report with metrics (returns, drawdown, win
                  rate, etc.).
                </li>
              </ol>
              <h3 className="font-semibold mb-2">
                Tips for Effective Backtesting
              </h3>
              <ul className="list-disc ml-6 text-sm text-muted-foreground mb-2">
                <li>Use realistic slippage and commission settings.</li>
                <li>Test across multiple market conditions and timeframes.</li>
                <li>
                  Analyze performance metrics and optimize your strategy
                  iteratively.
                </li>
                <li>Beware of overfitting—validate with out-of-sample data.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Fetching Live Prices */}
          <Card className="border-2">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-xl">Fetching Live Prices</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Fetch real-time stock prices using the market quote endpoint.
                  Make sure to set the authentication headers correctly as
                  described in the Authentication section.
                </p>

                <div className="bg-slate-950 p-6 rounded-lg border">
                  <pre className="text-sm text-slate-50 font-mono overflow-x-auto">
                    {`def fetch_stock_price(symbol):
    endpoint = f"{API_URL}/market/quote/{symbol}"
    response = requests.get(endpoint, headers=HEADERS)
    return response.json()`}
                  </pre>
                </div>

                <p className="text-sm text-muted-foreground">
                  Response format:
                </p>

                <div className="bg-slate-950 p-6 rounded-lg border">
                  <pre className="text-sm text-slate-50 font-mono overflow-x-auto">
                    {`{
  "success": true,
  "data": {
    "success": true,
    "data": {
      "symbol": "AAPL",
      "price": 257.84,
      "change": 1.3599854,
      "changePercent": 0.53025,
      "dayHigh": 258.52,
      "dayLow": 256.11,
      "volume": 17073976,
      "marketCap": 3826445975552,
      "pe": 39.125946,
      "timestamp": "2025-10-08T17:07:12.906Z"
    },
    "message": "Stock quote retrieved for AAPL"
  },
  "requestedBy": "punhaniabhishek17@gmail.com"
}`}
                  </pre>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Key Fields</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                        symbol
                      </code>
                      <span>Stock ticker symbol</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                        price
                      </code>
                      <span>Current stock price</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                        change
                      </code>
                      <span>Price change from previous close</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                        changePercent
                      </code>
                      <span>Percentage change</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Backtest Response Documentation */}
          <Card className="border-2">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-xl">
                Backtest Response Format
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Backtest results are returned in the following JSON format:
                </p>

                <div className="bg-slate-950 p-6 rounded-lg border">
                  <pre className="text-sm text-slate-50 font-mono overflow-x-auto">
                    {`{
  "backtest_id": "bt_001",
  "status": "completed",
  "results": {
    "summary": {
      "symbol": "AAPL",
      "period": {"start": "2023-01-01", "end": "2023-12-31"},
      "total_trades": 120,
      "winning_trades": 80,
      "losing_trades": 40,
      "win_rate": 66.67,
      "profit_factor": 1.5,
      "pnl": {
        "gross_profit": 15000,
        "gross_loss": -10000,
        "net_profit": 5000,
        "percentage_return": 10,
        "max_drawdown": -5
      },
      "risk_metrics": {
        "sharpe_ratio": 1.2,
        "sortino_ratio": 1.5,
        "alpha": 0.1,
        "beta": 0.8,
        "volatility": 0.2,
        "confidence_level": 95
      }
    },
    "equity_curve": [
      {"date": "2023-01-01", "equity": 10000},
      {"date": "2023-12-31", "equity": 11000}
    ],
    "trade_log": [
      {
        "trade_id": 1,
        "entry_date": "2023-01-10",
        "exit_date": "2023-01-20",
        "entry_price": 150,
        "exit_price": 155,
        "position": "long",
        "size": 100,
        "pnl": 500
      }
    ]
  }
}`}
                  </pre>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary"></div>
                      Summary Fields
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          symbol
                        </code>
                        <span>Trading symbol (e.g., AAPL)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          period
                        </code>
                        <span>Start and end dates</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          total_trades
                        </code>
                        <span>Total number of trades</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          win_rate
                        </code>
                        <span>Percentage of winning trades</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-muted-foreground"></div>
                      Key Metrics
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          net_profit
                        </code>
                        <span>Total profit/loss amount</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          percentage_return
                        </code>
                        <span>Total return percentage</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          sharpe_ratio
                        </code>
                        <span>Risk-adjusted return metric</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          max_drawdown
                        </code>
                        <span>Maximum peak-to-trough decline</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Complete Backtest Example</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock
                codes={{
                  Python: pythonBacktestCode,
                  Go: goBacktestCode,
                }}
                defaultLanguage="Python"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* No-Code Strategy Builder */}
      {activeSection === "no-code-builder" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>No-Code Strategy Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Build trading strategies without writing code using our visual
                form-based interface. The builder lets you design entry/exit
                rules, risk management, and asset selection with intuitive
                forms.
              </p>
              <h3 className="font-semibold mb-2">Features</h3>
              <ul className="list-disc ml-6 text-sm text-muted-foreground mb-2">
                <li>
                  Form-based configuration for technical indicators, signals,
                  and order types.
                </li>
                <li>Real-time strategy simulation and validation.</li>
                <li>
                  Export strategies to code or deploy directly to live trading.
                </li>
              </ul>
              <h3 className="font-semibold mb-2">Getting Started</h3>
              <ol className="list-decimal ml-6 text-sm text-muted-foreground mb-2">
                <li>Open the builder and select your asset class.</li>
                <li>
                  Design your strategy using blocks for logic, risk, and
                  execution.
                </li>
                <li>Simulate and backtest your strategy before deploying.</li>
              </ol>
              <Link href="/no-code-builder">
                <Button className="gap-2">
                  Open Strategy Builder <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default SectionContent;
