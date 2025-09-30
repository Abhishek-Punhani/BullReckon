"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  DollarSign,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  AlertCircle,
  Calendar,
  TrendingUpDown,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  AreaChart,
  Area,
} from "recharts";
import Navigation from "@/components/Navigation";
import { Separator } from "@/components/ui/separator";

// Mock data based on your backend models
const mockPortfolioData = {
  portfolio: {
    userId: "user123",
    cash: 75000,
    totalEquity: 125000,
    realizedPnL: 2500,
    unrealizedPnL: 3500,
    dayChange: 850,
    totalReturn: 25.0,
    positions: [
      {
        symbol: "AAPL",
        quantity: 100,
        avgBuyPrice: 150.0,
        totalInvested: 15000,
        currentPrice: 165.5,
        unrealizedPnL: 1550,
        lastUpdated: new Date(),
      },
      {
        symbol: "TSLA",
        quantity: 50,
        avgBuyPrice: 200.0,
        totalInvested: 10000,
        currentPrice: 220.0,
        unrealizedPnL: 1000,
        lastUpdated: new Date(),
      },
      {
        symbol: "GOOGL",
        quantity: 25,
        avgBuyPrice: 120.0,
        totalInvested: 3000,
        currentPrice: 138.0,
        unrealizedPnL: 450,
        lastUpdated: new Date(),
      },
      {
        symbol: "MSFT",
        quantity: 75,
        avgBuyPrice: 300.0,
        totalInvested: 22500,
        currentPrice: 306.67,
        unrealizedPnL: 500,
        lastUpdated: new Date(),
      },
    ],
  },
  recentTrades: [
    {
      symbol: "AAPL",
      action: "BUY",
      quantity: 25,
      triggerPrice: 160.0,
      total: 4000,
      executedAt: new Date(Date.now() - 86400000), // 1 day ago
      realizedPnL: null,
    },
    {
      symbol: "TSLA",
      action: "SELL",
      quantity: 10,
      triggerPrice: 215.0,
      total: 2150,
      executedAt: new Date(Date.now() - 172800000), // 2 days ago
      realizedPnL: 300,
    },
  ],
  riskSettings: {
    stopLossPercentage: 5.0,
    takeProfitPercentage: 10.0,
    maxDrawdownPercentage: 20.0,
    capitalAllocationPercentage: 25.0,
    riskPreset: "moderate",
  },
};

// Mock historical performance data
const performanceData = [
  { date: "Oct 1", value: 100000, drawdown: 0 },
  { date: "Oct 5", value: 102500, drawdown: -1.2 },
  { date: "Oct 10", value: 98500, drawdown: -3.5 },
  { date: "Oct 15", value: 108500, drawdown: 0 },
  { date: "Oct 20", value: 115000, drawdown: 0 },
  { date: "Oct 25", value: 118500, drawdown: 0 },
  { date: "Oct 30", value: 125000, drawdown: 0 },
];

const DashboardPage = () => {
  const [portfolio, setPortfolio] = useState(mockPortfolioData.portfolio);
  const [recentTrades, setRecentTrades] = useState(
    mockPortfolioData.recentTrades
  );
  const [riskSettings, setRiskSettings] = useState(
    mockPortfolioData.riskSettings
  );
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  // Calculate portfolio metrics
  const totalInvested = portfolio.positions.reduce(
    (sum, pos) => sum + pos.totalInvested,
    0
  );
  const currentValue = portfolio.positions.reduce(
    (sum, pos) => sum + pos.quantity * pos.currentPrice,
    0
  );
  const totalPnL = portfolio.realizedPnL + portfolio.unrealizedPnL;
  const totalReturnPercentage =
    ((portfolio.totalEquity - 100000) / 100000) * 100; // Assuming initial 100k
  const dayChangePercentage =
    (portfolio.dayChange / portfolio.totalEquity) * 100;
  const isProfitable = totalPnL >= 0;
  const isDayPositive = portfolio.dayChange >= 0;

  // Portfolio allocation data
  const allocationData = [
    {
      name: "Cash",
      value: portfolio.cash,
      color: "hsl(213, 94%, 68%)",
      percentage: (portfolio.cash / portfolio.totalEquity) * 100,
    },
    ...portfolio.positions.map((pos, index) => ({
      name: pos.symbol,
      value: pos.quantity * pos.currentPrice,
      color: `hsl(${140 + index * 50}, 70%, ${45 + index * 10}%)`,
      percentage:
        ((pos.quantity * pos.currentPrice) / portfolio.totalEquity) * 100,
    })),
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (percent: number) => {
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="lg:pl-64">
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-96" />
              <Skeleton className="h-96" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="lg:pl-64">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Portfolio Dashboard
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.firstName || "Trader"} • Last updated:{" "}
                {new Date().toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={isProfitable ? "default" : "destructive"}
                className="px-3 py-1"
              >
                {isProfitable ? "Profitable" : "At Loss"}
              </Badge>
              <Badge
                variant="outline"
                className={`px-3 py-1 ${
                  riskSettings.riskPreset === "conservative"
                    ? "border-green-500"
                    : riskSettings.riskPreset === "moderate"
                      ? "border-yellow-500"
                      : "border-red-500"
                }`}
              >
                Risk: {riskSettings.riskPreset}
              </Badge>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Balance
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(portfolio.totalEquity)}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {isDayPositive ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  )}
                  <span
                    className={
                      isDayPositive ? "text-green-600" : "text-red-600"
                    }
                  >
                    {formatPercentage(dayChangePercentage)} today
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Available Cash
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(portfolio.cash)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {((portfolio.cash / portfolio.totalEquity) * 100).toFixed(1)}%
                  of portfolio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Invested
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalInvested)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current value: {formatCurrency(currentValue)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                {isProfitable ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${isProfitable ? "text-green-600" : "text-red-600"}`}
                >
                  {formatCurrency(totalPnL)}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground">Realized:</span>
                  <span
                    className={
                      portfolio.realizedPnL >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {formatCurrency(portfolio.realizedPnL)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Return
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${totalReturnPercentage >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {formatPercentage(totalReturnPercentage)}
                </div>
                <p className="text-xs text-muted-foreground">Since inception</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Portfolio Performance Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Portfolio Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient
                        id="colorValue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="hsl(213, 94%, 68%)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(213, 94%, 68%)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
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
                      formatter={(value: any) => [
                        formatCurrency(value),
                        "Portfolio Value",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(213, 94%, 68%)"
                      fillOpacity={1}
                      fill="url(#colorValue)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Portfolio Allocation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Allocation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
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
                      formatter={(value: any) => [
                        formatCurrency(value),
                        "Value",
                      ]}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {allocationData.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span>{entry.name}</span>
                      </div>
                      <span className="font-medium">
                        {entry.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Positions and Recent Trades */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Positions */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpDown className="h-5 w-5" />
                  Current Holdings ({portfolio.positions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {portfolio.positions.map((position) => {
                    const currentValue =
                      position.quantity * position.currentPrice;
                    const unrealizedPnLPercentage =
                      (position.unrealizedPnL / position.totalInvested) * 100;

                    return (
                      <div
                        key={position.symbol}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="font-semibold text-lg">
                            {position.symbol}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {position.quantity} shares @{" "}
                            {formatCurrency(position.avgBuyPrice)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Invested: {formatCurrency(position.totalInvested)}
                          </div>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="font-semibold text-lg">
                            {formatCurrency(currentValue)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Current: {formatCurrency(position.currentPrice)}
                          </div>
                          <div
                            className={`text-sm font-medium flex items-center gap-1 justify-end ${
                              position.unrealizedPnL >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {position.unrealizedPnL >= 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {formatCurrency(Math.abs(position.unrealizedPnL))} (
                            {formatPercentage(unrealizedPnLPercentage)})
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTrades.map((trade, index) => (
                    <div
                      key={index}
                      className="p-3 border border-border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              trade.action === "BUY" ? "default" : "secondary"
                            }
                          >
                            {trade.action}
                          </Badge>
                          <span className="font-medium">{trade.symbol}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {trade.executedAt.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Quantity:</span>
                          <span>{trade.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span>{formatCurrency(trade.triggerPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span>{formatCurrency(trade.total)}</span>
                        </div>
                        {trade.realizedPnL !== null && (
                          <div className="flex justify-between">
                            <span>Realized P&L:</span>
                            <span
                              className={
                                trade.realizedPnL >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {formatCurrency(trade.realizedPnL)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full">
                    View All Trades
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
