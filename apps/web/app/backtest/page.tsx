"use client";
import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { API_CONFIG } from "@/config";

interface Backtest {
  _id: string;
  backtest_id: string;
  status: string;
  results: {
    summary: {
      symbol: string;
      period: { start: string; end: string };
      total_trades: number;
      winning_trades: number;
      losing_trades: number;
      win_rate: number;
      profit_factor: number;
      pnl: {
        gross_profit: number;
        gross_loss: number;
        net_profit: number;
        percentage_return: number;
        max_drawdown: number;
      };
      risk_metrics: {
        sharpe_ratio: number;
        sortino_ratio: number;
        alpha: number;
        beta: number;
        volatility: number;
        confidence_level: number;
      };
    };
    equity_curve: Array<{ date: string; equity: number }>;
    trade_log: Array<{
      trade_id: number;
      entry_date: string;
      exit_date: string;
      entry_price: number;
      exit_price: number;
      position: string;
      size: number;
      pnl: number;
    }>;
  };
  createdAt: string;
}

const BacktestPage = () => {
  const [backtests, setBacktests] = useState<Backtest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBacktest, setSelectedBacktest] = useState<Backtest | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchBacktests();
  }, []);

  const fetchBacktests = async () => {
    try {
      const res = await api.get(
        `${API_CONFIG.API_SERVER}/api/keys/get-backtests`
      );
      setBacktests(res.data.data || []);
    } catch (err) {
      console.error("Failed to load backtests:", err);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = (backtest: Backtest) => {
    setSelectedBacktest(backtest);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedBacktest(null);
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/40 to-background/80">
      <Navigation />
      <div className="lg:ml-64 container max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <FlaskConical className="h-7 w-7 text-primary" />
              My Backtests
            </h1>
            <p className="text-base text-muted-foreground mt-2">
              View and analyze your backtesting results
            </p>
          </div>
        </div>

        {/* Documentation reference */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm">Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              For detailed backtesting guides, examples and configuration
              options, see the API docs.
            </p>
            <Link
              href="/docs/api#backtesting"
              className="text-primary hover:underline"
            >
              Open API Docs — Backtesting →
            </Link>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading backtests...</p>
          </div>
        ) : backtests.length === 0 ? (
          <Card className="border-2 shadow-lg bg-gradient-to-br from-muted/30 to-background/70">
            <CardContent className="text-center py-10">
              <FlaskConical className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Backtests Found</h3>
              <p className="text-muted-foreground">
                You haven&apos;t run any backtests yet. Start by creating a
                strategy and running a backtest.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {backtests.map((backtest) => (
              <Card
                key={backtest._id}
                className="border-2 shadow-lg bg-gradient-to-br from-muted/30 to-background/70 hover:shadow-xl transition-shadow"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      {backtest.backtest_id}
                    </CardTitle>
                    <Badge
                      variant={
                        backtest.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {backtest.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Symbol:</span>
                      <p className="font-semibold">
                        {backtest.results.summary.symbol}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Period:</span>
                      <p className="font-semibold text-xs">
                        {new Date(
                          backtest.results.summary.period.start
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {new Date(
                          backtest.results.summary.period.end
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Win Rate:</span>
                      <p className="font-semibold">
                        {formatPercent(backtest.results.summary.win_rate)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Return:</span>
                      <p
                        className={`font-semibold ${backtest.results.summary.pnl.percentage_return >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {backtest.results.summary.pnl.percentage_return >= 0 ? (
                          <TrendingUp className="inline h-4 w-4 mr-1" />
                        ) : (
                          <TrendingDown className="inline h-4 w-4 mr-1" />
                        )}
                        {formatPercent(
                          backtest.results.summary.pnl.percentage_return
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => openDetails(backtest)}
                    className="w-full"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {/* API Documentation Section */}
        <Card className="border-2">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-xl">Backtest Response Format</CardTitle>
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
        {/* Modal for detailed view */}
        {modalOpen && selectedBacktest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-background border-b p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <PieChart className="h-6 w-6 text-primary" />
                  {selectedBacktest.backtest_id} Analysis
                </h2>
                <Button onClick={closeModal} variant="outline">
                  Close
                </Button>
              </div>
              <div className="p-6 space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {selectedBacktest.results.summary.total_trades}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total Trades
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {formatPercent(
                          selectedBacktest.results.summary.win_rate
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div
                        className={`text-2xl font-bold ${selectedBacktest.results.summary.pnl.net_profit >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatCurrency(
                          selectedBacktest.results.summary.pnl.net_profit
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Net Profit
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {selectedBacktest.results.summary.risk_metrics.sharpe_ratio.toFixed(
                          2
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Sharpe Ratio
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Equity Curve Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Equity Curve</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={selectedBacktest.results.equity_curve}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value) => [
                            formatCurrency(value as number),
                            "Equity",
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="equity"
                          stroke="#8884d8"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* PnL Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Trade P&L Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={selectedBacktest.results.trade_log}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="trade_id" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => [
                            formatCurrency(value as number),
                            "P&L",
                          ]}
                        />
                        <Bar dataKey="pnl" fill="#8884d8">
                          {selectedBacktest.results.trade_log.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"}
                              />
                            )
                          )}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Detailed Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Return:</span>
                        <span
                          className={
                            selectedBacktest.results.summary.pnl
                              .percentage_return >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {formatPercent(
                            selectedBacktest.results.summary.pnl
                              .percentage_return
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Drawdown:</span>
                        <span className="text-red-600">
                          {formatPercent(
                            selectedBacktest.results.summary.pnl.max_drawdown
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Profit Factor:</span>
                        <span>
                          {selectedBacktest.results.summary.profit_factor.toFixed(
                            2
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sortino Ratio:</span>
                        <span>
                          {selectedBacktest.results.summary.risk_metrics.sortino_ratio.toFixed(
                            2
                          )}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Volatility:</span>
                        <span>
                          {formatPercent(
                            selectedBacktest.results.summary.risk_metrics
                              .volatility
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Beta:</span>
                        <span>
                          {selectedBacktest.results.summary.risk_metrics.beta.toFixed(
                            2
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Alpha:</span>
                        <span>
                          {selectedBacktest.results.summary.risk_metrics.alpha.toFixed(
                            2
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence Level:</span>
                        <span>
                          {formatPercent(
                            selectedBacktest.results.summary.risk_metrics
                              .confidence_level
                          )}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Trade Log */}
                <Card>
                  <CardHeader>
                    <CardTitle>Trade Log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-semibold">
                              Trade ID
                            </th>
                            <th className="text-left p-3 font-semibold">
                              Entry Date
                            </th>
                            <th className="text-left p-3 font-semibold">
                              Exit Date
                            </th>
                            <th className="text-right p-3 font-semibold">
                              Entry Price
                            </th>
                            <th className="text-right p-3 font-semibold">
                              Exit Price
                            </th>
                            <th className="text-right p-3 font-semibold">
                              Size
                            </th>
                            <th className="text-right p-3 font-semibold">
                              P&L
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBacktest.results.trade_log.map((trade) => (
                            <tr
                              key={trade.trade_id}
                              className="border-b hover:bg-muted/50"
                            >
                              <td className="p-3">{trade.trade_id}</td>
                              <td className="p-3">
                                {new Date(
                                  trade.entry_date
                                ).toLocaleDateString()}
                              </td>
                              <td className="p-3">
                                {new Date(trade.exit_date).toLocaleDateString()}
                              </td>
                              <td className="p-3 text-right">
                                {formatCurrency(trade.entry_price)}
                              </td>
                              <td className="p-3 text-right">
                                {formatCurrency(trade.exit_price)}
                              </td>
                              <td className="p-3 text-right">{trade.size}</td>
                              <td
                                className="p-3 text-right"
                                style={{
                                  color: trade.pnl >= 0 ? "green" : "red",
                                }}
                              >
                                {formatCurrency(trade.pnl)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestPage;
