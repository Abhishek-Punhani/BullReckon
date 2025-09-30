"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  RefreshCw,
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
import {
  portfolioService,
  type DashboardData,
  type Portfolio,
  type RecentTrade,
  type RiskSettings,
  type PerformanceDataPoint,
} from "@/services/portfolioService";

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        // Use the user ID from the parsed user data
        const userId = parsedUser.id || parsedUser._id || parsedUser.userId;
        fetchDashboardData(userId);
      } catch (error) {
        console.error("Failed to parse user data:", error);
        setError("Failed to load user data. Please log in again.");
        setLoading(false);
      }
    } else {
      setError("Please log in to view your dashboard");
      setLoading(false);
    }
  }, []);

  const fetchDashboardData = async (userId?: string) => {
    try {
      setError(null);

      // Try to use the single dashboard endpoint first
      try {
        const data = await portfolioService.getDashboardData(userId);
        setDashboardData(data);
      } catch (dashboardError: any) {
        console.warn(
          "Dashboard endpoint failed, trying individual endpoints:",
          dashboardError
        );

        // Fallback to individual endpoints
        const [portfolioData, tradesData, riskData, performanceData] =
          await Promise.allSettled([
            portfolioService.getPortfolio(userId),
            portfolioService.getRecentTrades(userId, 5),
            portfolioService.getRiskSettings(),
            portfolioService.getPortfolioPerformance(userId),
          ]);

        const combinedData: DashboardData = {
          portfolio:
            portfolioData.status === "fulfilled"
              ? portfolioData.value
              : {
                  userId: userId || "",
                  cash: 100000,
                  positions: [],
                  totalEquity: 100000,
                  realizedPnL: 0,
                  unrealizedPnL: 0,
                  dayChange: 0,
                  totalReturn: 0,
                  totalInvested: 0,
                },
          recentTrades:
            tradesData.status === "fulfilled" ? tradesData.value : [],
          riskSettings:
            riskData.status === "fulfilled"
              ? riskData.value
              : {
                  userId: userId || "",
                  stopLossPercentage: 5.0,
                  takeProfitPercentage: 10.0,
                  maxDrawdownPercentage: 20.0,
                  capitalAllocationPercentage: 25.0,
                  riskPreset: "moderate",
                },
          performanceData:
            performanceData.status === "fulfilled" ? performanceData.value : [],
        };

        setDashboardData(combinedData);
      }
    } catch (error: any) {
      console.error("Dashboard fetch error:", error);
      if (error.message.includes("Authentication")) {
        setError("Please log in to access your dashboard");
      } else {
        setError(error.message || "Failed to load dashboard data");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (user) {
      setRefreshing(true);
      const userId = user.id || user._id || user.userId;
      fetchDashboardData(userId);
    }
  };

  // Extract data from dashboardData
  const portfolio = dashboardData?.portfolio;
  const recentTrades = dashboardData?.recentTrades || [];
  const riskSettings = dashboardData?.riskSettings;
  const performanceData = dashboardData?.performanceData || [];

  // Calculate metrics
  const totalPnL = portfolio
    ? portfolio.realizedPnL + portfolio.unrealizedPnL
    : 0;
  const totalReturnPercentage = portfolio?.totalReturn || 0;
  const dayChangePercentage = portfolio
    ? (portfolio.dayChange / portfolio.totalEquity) * 100
    : 0;
  const isProfitable = totalPnL >= 0;
  const isDayPositive = portfolio ? portfolio.dayChange >= 0 : false;

  // Portfolio allocation data
  const allocationData = portfolio
    ? [
        {
          name: "Cash",
          value: portfolio.cash,
          color: "hsl(213, 94%, 68%)",
          percentage: (portfolio.cash / portfolio.totalEquity) * 100,
        },
        ...portfolio.positions.map((pos, index) => ({
          name: pos.symbol,
          value: pos.currentValue,
          color: `hsl(${140 + index * 50}, 70%, ${45 + index * 10}%)`,
          percentage: (pos.currentValue / portfolio.totalEquity) * 100,
        })),
      ]
    : [];

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

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="lg:col-span-2 h-96" />
              <Skeleton className="h-96" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="lg:pl-64">
          <div className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                {error.includes("log in") && (
                  <Button
                    variant="outline"
                    className="ml-4"
                    onClick={() => (window.location.href = "/login")}
                  >
                    Go to Login
                  </Button>
                )}
                {!error.includes("log in") && (
                  <Button
                    variant="outline"
                    className="ml-4"
                    onClick={handleRefresh}
                  >
                    Try Again
                  </Button>
                )}
              </AlertDescription>
            </Alert>
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
                Welcome back, {user?.firstName || user?.name || "Trader"} • Last
                updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Badge
                variant={isProfitable ? "default" : "destructive"}
                className="px-3 py-1"
              >
                {isProfitable ? "Profitable" : "At Loss"}
              </Badge>
              {riskSettings && (
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
              )}
            </div>
          </div>

          {/* Key Metrics */}
          {portfolio && (
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
                      {formatCurrency(portfolio.dayChange)} (
                      {formatPercentage(dayChangePercentage)}) today
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
                    {((portfolio.cash / portfolio.totalEquity) * 100).toFixed(
                      1
                    )}
                    % of portfolio
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
                    {formatCurrency(portfolio.totalInvested)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current value:{" "}
                    {formatCurrency(
                      portfolio.positions.reduce(
                        (sum, pos) => sum + pos.currentValue,
                        0
                      )
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total P&L
                  </CardTitle>
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
                    <span className="text-muted-foreground">| Unrealized:</span>
                    <span
                      className={
                        portfolio.unrealizedPnL >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {formatCurrency(portfolio.unrealizedPnL)}
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
                  <p className="text-xs text-muted-foreground">
                    Since inception
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

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
                {performanceData.length > 0 ? (
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
                      <XAxis
                        dataKey="date"
                        stroke="hsl(210, 40%, 98%)"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        stroke="hsl(210, 40%, 98%)"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => formatCurrency(value)}
                      />
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
                        labelFormatter={(label) => `Date: ${label}`}
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
                ) : (
                  <div className="h-96 flex items-center justify-center text-muted-foreground">
                    No performance data available
                  </div>
                )}
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
                {allocationData.length > 0 ? (
                  <>
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
                  </>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No positions to display
                  </div>
                )}
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
                  Current Holdings ({portfolio?.positions.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {portfolio && portfolio.positions.length > 0 ? (
                  <div className="space-y-4">
                    {portfolio.positions.map((position) => (
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
                            {formatCurrency(position.currentValue)}
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
                            {formatPercentage(position.unrealizedPnLPercentage)}
                            )
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No positions yet. Start trading to see your holdings here.
                  </div>
                )}
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
                {recentTrades.length > 0 ? (
                  <div className="space-y-4">
                    {recentTrades.map((trade, index) => (
                      <div
                        key={trade._id || index}
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
                            {formatDate(trade.executedAt)}
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
                          {trade.fees && (
                            <div className="flex justify-between">
                              <span>Fees:</span>
                              <span>{formatCurrency(trade.fees)}</span>
                            </div>
                          )}
                          {trade.realizedPnL !== null &&
                            trade.realizedPnL !== undefined && (
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
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No trades yet. Your trading activity will appear here.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Risk Management Summary */}
          {riskSettings && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Risk Management Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Stop Loss
                    </div>
                    <div className="text-lg font-semibold">
                      {riskSettings.stopLossPercentage}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Take Profit
                    </div>
                    <div className="text-lg font-semibold">
                      {riskSettings.takeProfitPercentage}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Max Drawdown
                    </div>
                    <div className="text-lg font-semibold">
                      {riskSettings.maxDrawdownPercentage}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Position Size
                    </div>
                    <div className="text-lg font-semibold">
                      {riskSettings.capitalAllocationPercentage}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
