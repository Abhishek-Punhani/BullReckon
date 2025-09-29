"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockPortfolio, mockLeaderboard } from "@/lib/mockData";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  Trophy,
  DollarSign,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
} from "recharts";
import Navigation from "@/components/Navigation";

const DashboardPage = () => {
  const [portfolio] = useState(mockPortfolio);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Mock equity curve data
  const equityCurveData = [
    { date: "Sep 1", value: 100000 },
    { date: "Sep 5", value: 102500 },
    { date: "Sep 10", value: 105000 },
    { date: "Sep 15", value: 108500 },
    { date: "Sep 20", value: 112500 },
    { date: "Sep 23", value: 112500 },
  ];

  // Portfolio allocation data
  const allocationData = [
    { name: "Cash", value: portfolio.cash, color: "hsl(213, 94%, 68%)" },
    ...portfolio.positions.map((pos, index) => ({
      name: pos.symbol,
      value: pos.quantity * pos.current_price,
      color: `hsl(${140 + index * 50}, 70%, ${45 + index * 10}%)`,
    })),
  ];

  const totalPnL = portfolio.positions.reduce(
    (sum, pos) => sum + pos.unrealized_pnl,
    0
  );
  const isProfitable = totalPnL >= 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="lg:pl-64">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.email || "Trader"}
              </p>
            </div>
            <Badge
              variant={isProfitable ? "default" : "destructive"}
              className="px-3 py-1"
            >
              {isProfitable ? "Profitable" : "Loss"}
            </Badge>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="trading-gradient">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Balance
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${portfolio.total_value.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  +2.5% from last month
                </p>
              </CardContent>
            </Card>

            <Card className="trading-gradient">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Available Cash
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${portfolio.cash.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready for trading
                </p>
              </CardContent>
            </Card>

            <Card className="trading-gradient">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Unrealized P&L
                </CardTitle>
                {isProfitable ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${isProfitable ? "text-success" : "text-destructive"}`}
                >
                  {isProfitable ? "+" : ""}${totalPnL.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isProfitable ? "+" : ""}
                  {((totalPnL / portfolio.total_value) * 100).toFixed(2)}%
                </p>
              </CardContent>
            </Card>

            <Card className="trading-gradient">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Positions
                </CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {portfolio.positions.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across{" "}
                  {
                    new Set(
                      portfolio.positions.map((p) =>
                        p.symbol.replace("USDT", "")
                      )
                    ).size
                  }{" "}
                  assets
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Portfolio Performance Chart */}
            <Card className="trading-gradient">
              <CardHeader>
                <CardTitle>Portfolio Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={equityCurveData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(222, 16%, 25%)"
                    />
                    <XAxis dataKey="date" stroke="hsl(210, 40%, 98%)" />
                    <YAxis stroke="hsl(210, 40%, 98%)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 16%, 12%)",
                        border: "1px solid hsl(222, 16%, 20%)",
                        borderRadius: "6px",
                        color: "hsl(210, 40%, 98%)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(213, 94%, 68%)"
                      strokeWidth={2}
                      dot={{ fill: "hsl(213, 94%, 68%)", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Portfolio Allocation */}
            <Card className="trading-gradient">
              <CardHeader>
                <CardTitle>Portfolio Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }: any) =>
                        `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                      }
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 16%, 12%)",
                        border: "1px solid hsl(222, 16%, 20%)",
                        borderRadius: "6px",
                        color: "hsl(210, 40%, 98%)",
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Positions */}
            <Card className="trading-gradient">
              <CardHeader>
                <CardTitle>Current Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {portfolio.positions.map((position) => (
                    <div
                      key={position.symbol}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{position.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          {position.quantity} @ $
                          {position.avg_buy_price.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          $
                          {(
                            position.quantity * position.current_price
                          ).toLocaleString()}
                        </div>
                        <div
                          className={`text-sm ${position.unrealized_pnl >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {position.unrealized_pnl >= 0 ? "+" : ""}$
                          {position.unrealized_pnl.toLocaleString()}(
                          {position.unrealized_pnl >= 0 ? "+" : ""}
                          {position.unrealized_pnl_percentage.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard Preview */}
            <Card className="trading-gradient">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Competition Leaderboard</CardTitle>
                <Trophy className="h-5 w-5 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockLeaderboard.slice(0, 5).map((entry) => (
                    <div
                      key={entry.rank}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            entry.rank === 1
                              ? "bg-warning text-warning-foreground"
                              : entry.rank === 2
                                ? "bg-muted text-muted-foreground"
                                : entry.rank === 3
                                  ? "bg-destructive/20 text-destructive"
                                  : "bg-accent text-accent-foreground"
                          }`}
                        >
                          {entry.rank}
                        </div>
                        <div>
                          <div className="font-medium">{entry.user}</div>
                          <div className="text-sm text-muted-foreground">
                            {entry.trades} trades
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-success">
                          +{entry.roi}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${entry.pnl}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View Full Leaderboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
