"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Navigation from "@/components/Navigation";
import {
  History as HistoryIcon,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Search,
  Calendar,
  DollarSign,
  Activity,
  Target,
  BarChart3,
} from "lucide-react";
import { API_CONFIG } from "@/lib/config";
import axios from "axios";

interface TradeHistoryItem {
  _id: string;
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  triggerPrice: number;
  total: number;
  fees: number;
  executedAt: Date;
  realizedPnL?: number;
  unrealizedPnL?: number;
  source?: string;
  status: string;
  marketData?: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  };
}

const HistoryPage = () => {
  const [trades, setTrades] = useState<TradeHistoryItem[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<TradeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [symbolFilter, setSymbolFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [profitabilityFilter, setProfitabilityFilter] = useState("all");
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    fetchTrades();
  }, [limit]);

  useEffect(() => {
    filterTrades();
  }, [trades, searchTerm, symbolFilter, actionFilter, profitabilityFilter]);

  const fetchTrades = async () => {
    try {
      setError(null);
      if (!refreshing) setLoading(true);

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = user.id || user._id;
      const token = localStorage.getItem("access_token");

      if (!userId || !token) {
        throw new Error("Please log in to view your trade history");
      }

      const response = await axios.get(
        `${API_CONFIG.CALC_SERVER}/api/portfolio/${userId}/recent-trades?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch trades");
      }

      setTrades(data.data || []);
    } catch (error: any) {
      console.error("Failed to fetch trades:", error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterTrades = () => {
    let filtered = [...trades];

    // Filter by search term (symbol)
    if (searchTerm) {
      filtered = filtered.filter((trade) =>
        trade.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by symbol
    if (symbolFilter !== "all") {
      filtered = filtered.filter((trade) => trade.symbol === symbolFilter);
    }

    // Filter by action
    if (actionFilter !== "all") {
      filtered = filtered.filter((trade) => trade.action === actionFilter);
    }

    // Filter by profitability
    if (profitabilityFilter !== "all") {
      filtered = filtered.filter((trade) => {
        const pnl = trade.realizedPnL ?? trade.unrealizedPnL ?? 0;
        if (profitabilityFilter === "profitable") return pnl > 0;
        if (profitabilityFilter === "losing") return pnl < 0;
        return true;
      });
    }

    setFilteredTrades(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTrades();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSymbolFilter("all");
    setActionFilter("all");
    setProfitabilityFilter("all");
  };

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Time",
      "Symbol",
      "Action",
      "Quantity",
      "Price",
      "Total",
      "Fees",
      "Realized P&L",
      "Unrealized P&L",
      "Status",
      "Source",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredTrades.map((trade) =>
        [
          new Date(trade.executedAt).toLocaleDateString(),
          new Date(trade.executedAt).toLocaleTimeString(),
          trade.symbol,
          trade.action,
          trade.quantity,
          trade.triggerPrice,
          trade.total,
          trade.fees,
          trade.realizedPnL || "",
          trade.unrealizedPnL || "",
          trade.status,
          trade.source || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trade_history_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculate summary statistics
  const totalTrades = filteredTrades.length;
  const totalVolume = filteredTrades.reduce(
    (sum, trade) => sum + trade.total,
    0
  );
  const totalFees = filteredTrades.reduce((sum, trade) => sum + trade.fees, 0);
  const totalRealizedPnL = filteredTrades.reduce(
    (sum, trade) => sum + (trade.realizedPnL || 0),
    0
  );
  const totalUnrealizedPnL = filteredTrades.reduce(
    (sum, trade) => sum + (trade.unrealizedPnL || 0),
    0
  );
  const buyTrades = filteredTrades.filter((t) => t.action === "BUY").length;
  const sellTrades = filteredTrades.filter((t) => t.action === "SELL").length;
  const profitableTrades = filteredTrades.filter((t) => {
    const pnl = t.realizedPnL ?? t.unrealizedPnL ?? 0;
    return pnl > 0;
  }).length;
  const winRate =
    filteredTrades.length > 0
      ? (profitableTrades / filteredTrades.length) * 100
      : 0;
  const uniqueSymbols = [
    ...new Set(trades.map((trade) => trade.symbol)),
  ].sort();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96" />
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
                <Button
                  variant="outline"
                  className="ml-4"
                  onClick={handleRefresh}
                >
                  Try Again
                </Button>
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
                Trade History
              </h1>
              <p className="text-muted-foreground">
                View and analyze your trading activity • Showing {totalTrades}{" "}
                trades
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={limit.toString()}
                onValueChange={(value) => setLimit(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 trades</SelectItem>
                  <SelectItem value="100">100 trades</SelectItem>
                  <SelectItem value="250">250 trades</SelectItem>
                  <SelectItem value="500">500 trades</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleRefresh}
                size="sm"
                className="gap-2"
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                onClick={exportToCSV}
                variant="outline"
                disabled={!filteredTrades.length}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Trades
                </CardTitle>
                <HistoryIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTrades}</div>
                <p className="text-xs text-muted-foreground">
                  {buyTrades} buy, {sellTrades} sell
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Volume
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalVolume)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all trades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Fees
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalFees)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Transaction costs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Realized P&L
                </CardTitle>
                {totalRealizedPnL >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    totalRealizedPnL >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(totalRealizedPnL)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Closed positions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Unrealized P&L
                </CardTitle>
                {totalUnrealizedPnL >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    totalUnrealizedPnL >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(totalUnrealizedPnL)}
                </div>
                <p className="text-xs text-muted-foreground">Open positions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {profitableTrades} profitable trades
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Symbol</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search symbols..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Symbol</label>
                  <Select value={symbolFilter} onValueChange={setSymbolFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Symbols</SelectItem>
                      {uniqueSymbols.map((symbol) => (
                        <SelectItem key={symbol} value={symbol}>
                          {symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Action</label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="BUY">Buy</SelectItem>
                      <SelectItem value="SELL">Sell</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Profitability</label>
                  <Select
                    value={profitabilityFilter}
                    onValueChange={setProfitabilityFilter}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Trades</SelectItem>
                      <SelectItem value="profitable">Profitable</SelectItem>
                      <SelectItem value="losing">Losing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Actions</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Showing</label>
                  <div className="text-sm text-muted-foreground pt-2">
                    {filteredTrades.length} of {trades.length} trades
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trade History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Trade History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-medium text-muted-foreground">
                        Date & Time
                      </th>
                      <th className="text-left p-4 font-medium text-muted-foreground">
                        Symbol
                      </th>
                      <th className="text-left p-4 font-medium text-muted-foreground">
                        Action
                      </th>
                      <th className="text-right p-4 font-medium text-muted-foreground">
                        Quantity
                      </th>
                      <th className="text-right p-4 font-medium text-muted-foreground">
                        Price
                      </th>
                      <th className="text-right p-4 font-medium text-muted-foreground">
                        Total
                      </th>
                      <th className="text-right p-4 font-medium text-muted-foreground">
                        Fees
                      </th>
                      <th className="text-right p-4 font-medium text-muted-foreground">
                        P&L
                      </th>
                      <th className="text-center p-4 font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map((trade) => {
                      const pnl = trade.realizedPnL ?? trade.unrealizedPnL ?? 0;
                      const isPnLPositive = pnl >= 0;
                      const pnlType =
                        trade.realizedPnL !== undefined &&
                        trade.realizedPnL !== null
                          ? "Realized"
                          : "Unrealized";

                      return (
                        <tr
                          key={trade._id}
                          className="border-b border-border hover:bg-accent/50 transition-colors"
                        >
                          <td className="p-4 text-sm">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {new Date(
                                  trade.executedAt
                                ).toLocaleDateString()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(
                                  trade.executedAt
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold">
                              {trade.symbol}
                            </span>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={
                                trade.action === "BUY" ? "default" : "secondary"
                              }
                              className={
                                trade.action === "BUY"
                                  ? "bg-green-600 hover:bg-green-700 text-white"
                                  : "bg-red-600 hover:bg-red-700 text-white"
                              }
                            >
                              {trade.action}
                            </Badge>
                          </td>
                          <td className="p-4 text-right font-mono">
                            {trade.quantity.toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-mono">
                            {formatCurrency(trade.triggerPrice)}
                          </td>
                          <td className="p-4 text-right font-mono font-semibold">
                            {formatCurrency(trade.total)}
                          </td>
                          <td className="p-4 text-right font-mono text-muted-foreground">
                            {formatCurrency(trade.fees)}
                          </td>
                          <td className="p-4 text-right font-mono">
                            {pnl !== 0 ? (
                              <div className="flex flex-col items-end">
                                <span
                                  className={`font-semibold ${
                                    isPnLPositive
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {formatCurrency(pnl)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {pnlType}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                trade.status === "executed"
                                  ? "border-green-500 text-green-700"
                                  : "border-gray-500"
                              }`}
                            >
                              {trade.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredTrades.length === 0 && trades.length > 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">
                      No matching trades
                    </h3>
                    <p>
                      No trades match your current filters. Try adjusting your
                      search criteria.
                    </p>
                  </div>
                )}

                {trades.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No trades yet</h3>
                    <p>
                      Your trading history will appear here once you start
                      trading.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Load More */}
          {trades.length === limit && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => setLimit((prev) => prev + 100)}
                className="gap-2"
              >
                <HistoryIcon className="h-4 w-4" />
                Load More Trades
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default HistoryPage;
