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
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";
import { API_CONFIG } from "@/lib/config";
import axios from "axios";

// Enhanced interface
interface TradeHistoryItem {
  _id: string;
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  triggerPrice: number;
  total: number;
  fees: number;
  executedAt: Date;
  createdAt: Date;
  realizedPnL?: number;
  unrealizedPnL?: number;
  source: string;
  status: string;
  limitPrice?: number; // NEW
  stopPrice?: number; // NEW
  currentPrice?: number; // NEW
  orderTypeDescription?: string; // NEW
  statusWithContext?: string; // NEW
  triggerDistance?: number; // NEW
  triggerDistancePercent?: number; // NEW
  marketData?: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  };
}

// Enhanced filter interface
interface FilterInfo {
  symbol: string | null;
  action: string | null;
  status: string | null;
  orderSource: string | null; // NEW
  profitability: string | null;
  startDate: string | null;
  endDate: string | null;
  search: string | null;
  priceRange: string | null; // NEW
  showPending: string; // NEW
  sortBy: string;
  sortOrder: string;
}

// Enhanced summary interface
interface SummaryStats {
  totalTrades: number;
  totalVolume: number;
  totalFees: number;
  totalRealizedPnL: number;
  totalUnrealizedPnL: number;
  buyTrades: number;
  sellTrades: number;
  marketOrders: number; // NEW
  limitOrders: number; // NEW
  stopLossOrders: number; // NEW
  takeProfitOrders: number; // NEW
  executedTrades: number; // NEW
  pendingTrades: number; // NEW
  cancelledTrades: number; // NEW
  profitableTrades: number;
  uniqueSymbols: number;
  winRate: number;
}

const HistoryPage = () => {
  const [trades, setTrades] = useState<TradeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Enhanced filter states
  const [filters, setFilters] = useState<FilterInfo>({
    symbol: null,
    action: null,
    status: null,
    orderSource: null, // NEW
    profitability: null,
    startDate: null,
    endDate: null,
    search: null,
    priceRange: null, // NEW
    showPending: "true", // NEW
    sortBy: "executedAt",
    sortOrder: "desc",
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTrades: 0,
    limit: 25,
    hasNext: false,
    hasPrev: false,
  });

  const [summary, setSummary] = useState<SummaryStats>({
    totalTrades: 0,
    totalVolume: 0,
    totalFees: 0,
    totalRealizedPnL: 0,
    totalUnrealizedPnL: 0,
    buyTrades: 0,
    sellTrades: 0,
    marketOrders: 0,
    limitOrders: 0,
    stopLossOrders: 0,
    takeProfitOrders: 0,
    executedTrades: 0,
    pendingTrades: 0,
    cancelledTrades: 0,
    profitableTrades: 0,
    uniqueSymbols: 0,
    winRate: 0,
  });

  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "executed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Pause className="h-4 w-4 text-gray-500" />;
    }
  };

  // Helper function to get order source color
  const getOrderSourceColor = (source: string) => {
    switch (source) {
      case "market":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "limit":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "stop_loss":
        return "bg-red-100 text-red-800 border-red-200";
      case "take_profit":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

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

      // Enhanced query parameters
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        showPending: filters.showPending,
      });

      // Add all filters
      if (filters.symbol) params.append("symbol", filters.symbol);
      if (filters.action) params.append("action", filters.action);
      if (filters.status) params.append("status", filters.status);
      if (filters.orderSource)
        params.append("orderSource", filters.orderSource);
      if (filters.profitability)
        params.append("profitability", filters.profitability);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.search) params.append("search", filters.search);
      if (filters.priceRange) params.append("priceRange", filters.priceRange);

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

      if (data.data && data.data.length > 0) {
        const symbols = [
          ...new Set(data.data.map((trade: TradeHistoryItem) => trade.symbol)),
        ];
        setAvailableSymbols(symbols.sort() as string[]);
      }
    } catch (error: any) {
      console.error("Failed to fetch trades:", error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleFilterChange = (key: keyof FilterInfo, value: string | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Enhanced filters section
  const renderEnhancedFilters = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Advanced Filters & Search
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Existing filters */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Symbol</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search symbols..."
                value={filters.search || ""}
                onChange={(e) =>
                  handleFilterChange("search", e.target.value || null)
                }
                className="pl-10"
              />
            </div>
          </div>

          {/* NEW: Order Source Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Order Type</label>
            <Select
              value={filters.orderSource || "all"}
              onValueChange={(value) =>
                handleFilterChange(
                  "orderSource",
                  value === "all" ? null : value
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Order Types</SelectItem>
                <SelectItem value="market">Market Orders</SelectItem>
                <SelectItem value="limit">Limit Orders</SelectItem>
                <SelectItem value="stop_loss">Stop Loss</SelectItem>
                <SelectItem value="take_profit">Take Profit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* NEW: Show/Hide Pending Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Show Pending Orders</label>
            <Select
              value={filters.showPending}
              onValueChange={(value) =>
                handleFilterChange("showPending", value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Show Pending
                  </div>
                </SelectItem>
                <SelectItem value="false">
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    Hide Pending
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Existing symbol filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Symbol</label>
            <Select
              value={filters.symbol || "all"}
              onValueChange={(value) =>
                handleFilterChange("symbol", value === "all" ? null : value)
              }
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
        </div>

        {/* Second row of filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* NEW: Price Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Price Range</label>
            <Input
              placeholder="Min,Max (e.g., 100,500)"
              value={filters.priceRange || ""}
              onChange={(e) =>
                handleFilterChange("priceRange", e.target.value || null)
              }
            />
          </div>

          {/* Existing filters... */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Action</label>
            <Select
              value={filters.action || "all"}
              onValueChange={(value) =>
                handleFilterChange("action", value === "all" ? null : value)
              }
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
            <label className="text-sm font-medium">Status</label>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                handleFilterChange("status", value === "all" ? null : value)
              }
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
            <label className="text-sm font-medium">Profitability</label>
            <Select
              value={filters.profitability || "all"}
              onValueChange={(value) =>
                handleFilterChange(
                  "profitability",
                  value === "all" ? null : value
                )
              }
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
      </CardContent>
    </Card>
  );

  // Enhanced summary cards
  const renderEnhancedSummary = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
      {/* Existing cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
          <HistoryIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalTrades}</div>
          <p className="text-xs text-muted-foreground">
            {summary.buyTrades} buy, {summary.sellTrades} sell
          </p>
        </CardContent>
      </Card>

      {/* NEW: Order Types Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Order Types</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold text-blue-600">
            {summary.marketOrders}
          </div>
          <p className="text-xs text-muted-foreground">Market orders</p>
          <div className="flex justify-between text-xs mt-1">
            <span>Limit: {summary.limitOrders}</span>
            <span>SL: {summary.stopLossOrders}</span>
            <span>TP: {summary.takeProfitOrders}</span>
          </div>
        </CardContent>
      </Card>

      {/* NEW: Status Breakdown Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Status</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold text-green-600">
            {summary.executedTrades}
          </div>
          <p className="text-xs text-muted-foreground">Executed</p>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-yellow-600">
              Pending: {summary.pendingTrades}
            </span>
            <span className="text-red-600">
              Cancelled: {summary.cancelledTrades}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Existing cards with slight modifications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.totalVolume)}
          </div>
          <p className="text-xs text-muted-foreground">Across all trades</p>
        </CardContent>
      </Card>

      {/* Continue with other existing cards... */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Realized P&L</CardTitle>
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
          <p className="text-xs text-muted-foreground">Closed positions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
          {summary.totalUnrealizedPnL >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              summary.totalUnrealizedPnL >= 0
                ? "text-green-600"
                : "text-red-600"
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
          <div className="text-2xl font-bold">
            {summary.winRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            {summary.profitableTrades} profitable trades
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.totalFees)}
          </div>
          <p className="text-xs text-muted-foreground">Transaction costs</p>
        </CardContent>
      </Card>
    </div>
  );

  // Enhanced trade table with detailed information
  const renderEnhancedTradeTable = () => (
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
                <th className="text-left p-4 font-medium text-muted-foreground">
                  Date & Time
                </th>
                <th className="text-left p-4 font-medium text-muted-foreground">
                  Symbol
                </th>
                <th className="text-left p-4 font-medium text-muted-foreground">
                  Action
                </th>
                <th className="text-left p-4 font-medium text-muted-foreground">
                  Order Type
                </th>
                <th className="text-left p-4 font-medium text-muted-foreground">
                  Quantity
                </th>
                <th className="text-left p-4 font-medium text-muted-foreground">
                  Trigger Price
                </th>
                <th className="text-left p-4 font-medium text-muted-foreground">
                  Limit/Stop Price
                </th>
                <th className="text-left p-4 font-medium text-muted-foreground">
                  Current Price
                </th>
                <th className="text-left p-4 font-medium text-muted-foreground">
                  Total
                </th>
                <th className="text-left p-4 font-medium text-muted-foreground">
                  P&L
                </th>
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
                  trade.realizedPnL !== undefined && trade.realizedPnL !== null
                    ? "Realized"
                    : "Unrealized";

                return (
                  <tr
                    key={trade._id}
                    className="border-b border-border hover:bg-accent/50 transition-colors"
                  >
                    {/* Date & Time */}
                    <td className="p-4 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {trade.executedAt
                            ? new Date(trade.executedAt).toLocaleDateString()
                            : new Date(trade.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {trade.executedAt
                            ? new Date(trade.executedAt).toLocaleTimeString()
                            : new Date(trade.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>

                    {/* Symbol */}
                    <td className="p-4">
                      <span className="font-semibold">{trade.symbol}</span>
                    </td>

                    {/* Action */}
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

                    {/* Order Type - ENHANCED */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <Badge
                          className={`text-xs ${getOrderSourceColor(trade.source)}`}
                        >
                          {trade.orderTypeDescription || trade.source}
                        </Badge>
                        {trade.triggerDistance && (
                          <span className="text-xs text-muted-foreground">
                            {trade.triggerDistancePercent?.toFixed(2)}% away
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="p-4 text-right font-mono">
                      {trade.quantity.toLocaleString()}
                    </td>

                    {/* Trigger Price */}
                    <td className="p-4 text-right font-mono">
                      {formatCurrency(trade.triggerPrice)}
                    </td>

                    {/* Limit/Stop Price - NEW */}
                    <td className="p-4 text-right font-mono">
                      {trade.limitPrice ? (
                        <div className="flex flex-col">
                          <span className="text-purple-600">
                            {formatCurrency(trade.limitPrice)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Limit
                          </span>
                        </div>
                      ) : trade.stopPrice ? (
                        <div className="flex flex-col">
                          <span
                            className={
                              trade.source === "stop_loss"
                                ? "text-red-600"
                                : "text-green-600"
                            }
                          >
                            {formatCurrency(trade.stopPrice)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {trade.source === "stop_loss" ? "Stop" : "Target"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Current Price - NEW */}
                    <td className="p-4 text-right font-mono">
                      {trade.currentPrice ? (
                        <div className="flex flex-col">
                          <span>{formatCurrency(trade.currentPrice)}</span>
                          {trade.status === "pending" &&
                            trade.triggerDistance && (
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(trade.triggerDistance)} away
                              </span>
                            )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Total */}
                    <td className="p-4 text-right font-mono font-semibold">
                      {formatCurrency(trade.total)}
                    </td>

                    {/* P&L */}
                    <td className="p-4 text-right font-mono">
                      {pnl !== 0 ? (
                        <div className="flex flex-col items-end">
                          <span
                            className={`font-semibold ${isPnLPositive ? "text-green-600" : "text-red-600"}`}
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

                    {/* Status - ENHANCED */}
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(trade.status)}
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
                            {trade.statusWithContext || trade.status}
                          </Badge>
                        </div>
                        {trade.status === "pending" &&
                          trade.source !== "market" && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Info className="h-3 w-3" />
                              <span>Monitoring</span>
                            </div>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {trades.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No matching trades</h3>
              <p>
                No trades match your current filters. Try adjusting your search
                criteria.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="lg:pl-64">
          <div className="p-6 space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
              {[...Array(8)].map((_, i) => (
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
                  onClick={() => fetchTrades()}
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
                {" "}
                Trade History
              </h1>
              <p className="text-muted-foreground">
                Complete trading activity with detailed order information • Page{" "}
                {pagination.currentPage} of {pagination.totalPages} •{" "}
                {pagination.totalTrades} total trades
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={pagination.limit.toString()}
                onValueChange={(value) =>
                  setPagination((prev) => ({
                    ...prev,
                    limit: parseInt(value),
                    currentPage: 1,
                  }))
                }
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
                onClick={() => {
                  setRefreshing(true);
                  fetchTrades();
                }}
                size="sm"
                className="gap-2"
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          {/* Enhanced Summary Statistics */}
          {renderEnhancedSummary()}

          {/* Enhanced Filters */}
          {renderEnhancedFilters()}

          {/* Enhanced Trade History Table */}
          {renderEnhancedTradeTable()}

          {/* Pagination - Keep existing implementation */}
        </div>
      </main>
    </div>
  );
};

export default HistoryPage;
