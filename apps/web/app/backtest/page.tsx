"use client";
import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { mockBacktestResult, SYMBOLS } from "@/lib/mockData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FlaskConical,
  Play,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const Backtest = () => {
  const [backtestConfig, setBacktestConfig] = useState({
    symbol: "BTCUSDT",
    start_date: "2023-01-01",
    end_date: "2023-12-31",
    strategy_url: "",
    initial_capital: 10000,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(mockBacktestResult);
  const [hasResults, setHasResults] = useState(true);
  const { toast } = useToast();

  const runBacktest = async () => {
    if (!backtestConfig.strategy_url) {
      toast({
        title: "Missing Strategy URL",
        description: "Please provide a strategy API endpoint to backtest.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setHasResults(false);

    // Simulate backtesting process
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Generate mock results
    const mockResults = {
      ...mockBacktestResult,
      total_return: Math.random() * 30 - 5, // -5% to 25%
      max_drawdown: Math.random() * 15 + 2, // 2% to 17%
      sharpe_ratio: Math.random() * 2 + 0.5, // 0.5 to 2.5
      win_rate: Math.random() * 40 + 40, // 40% to 80%
    };

    setResults(mockResults);
    setHasResults(true);

    toast({
      title: "Backtest Complete",
      description: `Strategy achieved ${mockResults.total_return.toFixed(
        2
      )}% return with ${mockResults.win_rate.toFixed(1)}% win rate.`,
    });

    setIsRunning(false);
  };

  const isPositiveReturn = results.total_return >= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/40 to-background/80">
      <Navigation />
      <div className="container max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-2">
              <FlaskConical className="h-7 w-7 text-primary" />
              Strategy Backtesting
            </h1>
            <p className="text-base text-muted-foreground mt-2">
              Test your trading strategies against historical data
            </p>
          </div>
        </div>

        {/* Backtest Configuration */}
        <Card className="border-2 shadow-lg bg-gradient-to-br from-muted/30 to-background/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FlaskConical className="h-5 w-5 text-primary" />
              Backtest Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="symbol">Trading Symbol</Label>
                <Select
                  value={backtestConfig.symbol}
                  onValueChange={(value) =>
                    setBacktestConfig((prev) => ({ ...prev, symbol: value }))
                  }
                >
                  <SelectTrigger className="h-11 border rounded-lg shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SYMBOLS.map((symbol) => (
                      <SelectItem key={symbol.value} value={symbol.value}>
                        <div className="flex items-center gap-2">
                          <span>{symbol.icon}</span>
                          <span>{symbol.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  className="h-11 border rounded-lg shadow-sm"
                  value={backtestConfig.start_date}
                  onChange={(e) =>
                    setBacktestConfig((prev) => ({
                      ...prev,
                      start_date: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  className="h-11 border rounded-lg shadow-sm"
                  value={backtestConfig.end_date}
                  onChange={(e) =>
                    setBacktestConfig((prev) => ({
                      ...prev,
                      end_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="strategy-url">Strategy API URL</Label>
                <Input
                  id="strategy-url"
                  placeholder="https://api.example.com/strategy"
                  className="h-11 border rounded-lg shadow-sm"
                  value={backtestConfig.strategy_url}
                  onChange={(e) =>
                    setBacktestConfig((prev) => ({
                      ...prev,
                      strategy_url: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial-capital">Initial Capital ($)</Label>
                <Input
                  id="initial-capital"
                  type="number"
                  placeholder="10000"
                  className="h-11 border rounded-lg shadow-sm"
                  value={backtestConfig.initial_capital}
                  onChange={(e) =>
                    setBacktestConfig((prev) => ({
                      ...prev,
                      initial_capital: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <Button
              onClick={runBacktest}
              disabled={isRunning}
              className="w-full md:w-auto shadow glow-success font-semibold text-base"
            >
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? "Running Backtest..." : "Run Backtest"}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {hasResults && (
          <>
            {/* Trade History */}
            <Card className="border-2 shadow-lg bg-gradient-to-br from-muted/30 to-background/70">
              <CardHeader>
                <CardTitle>Backtest Trade History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left p-4 font-semibold text-muted-foreground">
                          Date
                        </th>
                        <th className="text-left p-4 font-semibold text-muted-foreground">
                          Action
                        </th>
                        <th className="text-right p-4 font-semibold text-muted-foreground">
                          Quantity
                        </th>
                        <th className="text-right p-4 font-semibold text-muted-foreground">
                          Price
                        </th>
                        <th className="text-right p-4 font-semibold text-muted-foreground">
                          Fees
                        </th>
                        <th className="text-right p-4 font-semibold text-muted-foreground">
                          P&L
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.trades.map((trade) => (
                        <tr
                          key={trade.id}
                          className="border-b border-border hover:bg-accent/40 transition"
                        >
                          <td className="p-4">
                            {new Date(trade.timestamp).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={
                                trade.action === "BUY"
                                  ? "default"
                                  : "destructive"
                              }
                              className={
                                trade.action === "BUY"
                                  ? "bg-green-500/10 text-green-700 border-green-500/20"
                                  : "bg-red-500/10 text-red-700 border-red-500/20"
                              }
                            >
                              {trade.action}
                            </Badge>
                          </td>
                          <td className="p-4 text-right font-mono">
                            {trade.quantity}
                          </td>
                          <td className="p-4 text-right font-mono">
                            ${trade.price.toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-mono text-muted-foreground">
                            ${trade.fees.toFixed(2)}
                          </td>
                          <td className="p-4 text-right font-mono">
                            {trade.pnl !== 0 && (
                              <span
                                className={
                                  trade.pnl > 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {trade.pnl > 0 ? "+" : ""}$
                                {trade.pnl.toFixed(2)}
                              </span>
                            )}
                            {trade.pnl === 0 && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Performance Analysis */}
            <Card className="border-2 shadow-lg bg-gradient-to-br from-muted/30 to-background/70">
              <CardHeader>
                <CardTitle>Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Risk Metrics</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Volatility:
                        </span>
                        <span>18.3%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Beta:</span>
                        <span>0.85</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          VaR (95%):
                        </span>
                        <span className="text-red-600">-$245</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Trade Statistics</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Total Trades:
                        </span>
                        <span>{results.trades.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Avg Hold Time:
                        </span>
                        <span>4.2 days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Profit Factor:
                        </span>
                        <span>1.45</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Benchmark Comparison</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Strategy Return:
                        </span>
                        <span
                          className={
                            isPositiveReturn ? "text-green-600" : "text-red-600"
                          }
                        >
                          {isPositiveReturn ? "+" : ""}
                          {results.total_return.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Market Return:
                        </span>
                        <span className="text-green-600">+8.5%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Alpha:</span>
                        <span
                          className={
                            results.total_return > 8.5
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {(results.total_return - 8.5).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Backtest;
