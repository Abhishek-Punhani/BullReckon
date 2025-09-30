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
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
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

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalTrades: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface FilterInfo {
  symbol: string | null;
  action: string | null;
  status: string | null;
  profitability: string | null;
  startDate: string | null;
  endDate: string | null;
  search: string | null;
  sortBy: string;
  sortOrder: string;
}

interface SummaryStats {
  totalTrades: number;
  totalVolume: number;
  totalFees: number;
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  buyTrades: number;
  sellTrades: number;
  profitableTrades: number;
  uniqueSymbols: number;
  winRate: number;
}

const HistoryPage = () => {
  const [trades, setTrades] = useState<TradeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalTrades: 0,
    limit: 25,
    hasNext: false,
    hasPrev: false,
  });

  // Filter states
  const [filters, setFilters] = useState<FilterInfo>({
    symbol: null,
    action: null,
    status: null,
    profitability: null,
    startDate: null,
    endDate: null,
    search: null,
    sortBy: "executedAt",
    sortOrder: "desc",
  });

  // Summary statistics
  const [summary, setSummary] = useState<SummaryStats>({
    totalTrades: 0,
    totalVolume: 0,
    totalFees: 0,
    totalRealizedPnL: 0,
    totalUnrealizedPnL: 0,
    buyTrades: 0,
    sellTrades: 0,
    profitableTrades: 0,
    uniqueSymbols: 0,
    winRate: 0,
  });

  // Available symbols for filter dropdown
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);

  useEffect(() => {
    fetchTrades();
  }, [pagination.currentPage, pagination.limit, filters]);

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

      // Build query parameters
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      // Add filters if they exist
      if (filters.symbol) params.append("symbol", filters.symbol);
      if (filters.action) params.append("action", filters.action);
      if (filters.status) params.append("status", filters.status);
      if (filters.profitability) params.append("profitability", filters.profitability);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.search) params.append("search", filters.search);

      const response = await axios.get(
        `${API_CONFIG.CALC_SERVER}/api/portfolio/${userId}/recent-trades?${params}`,
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
      setPagination(data.pagination || pagination);
      setSummary(data.summary || summary);

      // Extract unique symbols for filter dropdown
      if (data.data && data.data.length > 0) {
        const symbols = [...new Set(data.data.map((trade: TradeHistoryItem) => trade.symbol))];
        setAvailableSymbols((symbols.sort() as string[]));
      }
    } catch (error: any) {
      console.error("Failed to fetch trades:", error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTrades();
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  const handleLimitChange = (newLimit: string) => {
    setPagination(prev => ({ 
      ...prev, 
      limit: parseInt(newLimit),
      currentPage: 1 // Reset to first page when changing limit
    }));
  };

  const handleFilterChange = (key: keyof FilterInfo, value: string | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page when filtering
  };

  const handleSortChange = (field: string) => {
    const newOrder = filters.sortBy === field && filters.sortOrder === "desc" ? "asc" : "desc";
    setFilters(prev => ({ 
      ...prev, 
      sortBy: field, 
      sortOrder: newOrder 
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      symbol: null,
      action: null,
      status: null,
      profitability: null,
      startDate: null,
      endDate: null,
      search: null,
      sortBy: "executedAt",
      sortOrder: "desc",
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
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
      ...trades.map((trade) =>
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th 
      className="text-left p-4 font-medium text-muted-foreground cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => handleSortChange(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3" />
        {filters.sortBy === field && (
          <span className="text-xs">
            {filters.sortOrder === "desc" ? "↓" : "↑"}
          </span>
        )}
      </div>
    </th>
  );

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
                View and analyze your trading activity • Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalTrades} total trades
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={pagination.limit.toString()}
                onValueChange={handleLimitChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
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
                disabled={!trades.length}
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
                <div className="text-2xl font-bold">{summary.totalTrades}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.buyTrades} buy, {summary.sellTrades} sell
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
                  {formatCurrency(summary.totalVolume)}
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
                  {formatCurrency(summary.totalFees)}
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
                {summary.totalRealizedPnL >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    summary.totalRealizedPnL >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(summary.totalRealizedPnL)}
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
                {summary.totalUnrealizedPnL >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    summary.totalUnrealizedPnL >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(summary.totalUnrealizedPnL)}
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
                <div className="text-2xl font-bold">{summary.winRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {summary.profitableTrades} profitable trades
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Advanced Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Symbol</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search symbols..."
                      value={filters.search || ""}
                      onChange={(e) => handleFilterChange("search", e.target.value || null)}
                      className="pl-10"
                    />
                    {filters.search && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => handleFilterChange("search", null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Symbol</label>
                  <Select 
                    value={filters.symbol || "all"} 
                    onValueChange={(value) => handleFilterChange("symbol", value === "all" ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Symbols</SelectItem>
                      {availableSymbols.map((symbol) => (
                        <SelectItem key={symbol} value={symbol}>
                          {symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Action</label>
                  <Select 
                    value={filters.action || "all"} 
                    onValueChange={(value) => handleFilterChange("action", value === "all" ? null : value)}
                  >
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
                    value={filters.profitability || "all"}
                    onValueChange={(value) => handleFilterChange("profitability", value === "all" ? null : value)}
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={filters.startDate || ""}
                    onChange={(e) => handleFilterChange("startDate", e.target.value || null)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={filters.endDate || ""}
                    onChange={(e) => handleFilterChange("endDate", e.target.value || null)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select 
                    value={filters.status || "all"} 
                    onValueChange={(value) => handleFilterChange("status", value === "all" ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="executed">Executed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
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
                    Clear All Filters
                  </Button>
                </div>
              </div>

              {/* Active filters display */}
              {(filters.symbol || filters.action || filters.profitability || filters.search || filters.startDate || filters.endDate || filters.status) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-sm font-medium">Active filters:</span>
                  {filters.symbol && (
                    <Badge variant="secondary" className="gap-1">
                      Symbol: {filters.symbol}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleFilterChange("symbol", null)}
                      />
                    </Badge>
                  )}
                  {filters.action && (
                    <Badge variant="secondary" className="gap-1">
                      Action: {filters.action}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleFilterChange("action", null)}
                      />
                    </Badge>
                  )}
                  {filters.profitability && (
                    <Badge variant="secondary" className="gap-1">
                      P&L: {filters.profitability}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleFilterChange("profitability", null)}
                      />
                    </Badge>
                  )}
                  {filters.search && (
                    <Badge variant="secondary" className="gap-1">
                      Search: {filters.search}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleFilterChange("search", null)}
                      />
                    </Badge>
                  )}
                  {(filters.startDate || filters.endDate) && (
                    <Badge variant="secondary" className="gap-1">
                      Date: {filters.startDate || "Start"} - {filters.endDate || "End"}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => {
                          handleFilterChange("startDate", null);
                          handleFilterChange("endDate", null);
                        }}
                      />
                    </Badge>
                  )}
                  {filters.status && (
                    <Badge variant="secondary" className="gap-1">
                      Status: {filters.status}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleFilterChange("status", null)}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trade History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Trade History
                <span className="text-sm font-normal text-muted-foreground">
                  ({trades.length} trades on this page)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <SortableHeader field="executedAt">Date & Time</SortableHeader>
                      <SortableHeader field="symbol">Symbol</SortableHeader>
                      <SortableHeader field="action">Action</SortableHeader>
                      <SortableHeader field="quantity">Quantity</SortableHeader>
                      <SortableHeader field="triggerPrice">Price</SortableHeader>
                      <SortableHeader field="total">Total</SortableHeader>
                      <SortableHeader field="fees">Fees</SortableHeader>
                      <SortableHeader field="realizedPnL">P&L</SortableHeader>
                      <th className="text-center p-4 font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => {
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
                                  : trade.status === "pending"
                                  ? "border-yellow-500 text-yellow-700"
                                  : "border-red-500 text-red-700"
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

                {trades.length === 0 && (
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
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.totalTrades)} of {pagination.totalTrades} trades
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrev}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.currentPage >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === pagination.currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNext}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
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

export default HistoryPage;