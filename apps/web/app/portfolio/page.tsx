"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Navigation from "@/components/Navigation";
import { useCentralPrices } from "@/hooks/use-centralPrice";
import {
  TrendingUpDown,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Search,
  DollarSign,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import axios from "axios";
import { API_CONFIG } from "@/config";

interface Position {
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercentage: number;
  lastUpdated: Date;
}

interface PositionsData {
  positions: Position[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  summary: {
    totalPositions: number;
    totalInvested: number;
    totalCurrentValue: number;
    totalUnrealizedPnL: number;
    totalRealizedPnL: number; // Add realized P&L to interface
    profitablePositions: number;
    losingPositions: number;
    winRate: number;
    averageReturn: number;
  };
}

interface Filters {
  page: number;
  limit: number;
  search: string;
  profitability: string;
  sortBy: string;
  sortOrder: string;
  minInvestment: string;
  maxInvestment: string;
  minPnL: string;
  maxPnL: string;
}

const HoldingsPage = () => {
  const router = useRouter();
  const [positionsData, setPositionsData] = useState<PositionsData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filter states
  const [filters, setFilters] = useState<Filters>({
    page: 1,
    limit: 20,
    search: "",
    profitability: "all",
    sortBy: "currentValue",
    sortOrder: "desc",
    minInvestment: "",
    maxInvestment: "",
    minPnL: "",
    maxPnL: "",
  });

  // Extract symbols from positions for live price updates
  const symbols = useMemo(() => {
    return positionsData?.positions?.map((pos) => pos.symbol) || [];
  }, [positionsData?.positions]);

  // Subscribe to live prices using central price service
  const { prices: livePrices, isConnected: pricesConnected } = useCentralPrices(
    {
      symbols,
      enabled: symbols.length > 0,
    }
  );

  // Update positions with live prices
  const updatedPositions = useMemo(() => {
    if (!positionsData?.positions) return [];

    return positionsData.positions.map((position) => {
      const livePrice = livePrices[position.symbol];
      if (livePrice) {
        const currentPrice = livePrice.price;
        const currentValue = position.quantity * currentPrice;
        const unrealizedPnL = currentValue - position.totalInvested;
        const unrealizedPnLPercentage =
          (unrealizedPnL / position.totalInvested) * 100;

        return {
          ...position,
          currentPrice,
          currentValue,
          unrealizedPnL,
          unrealizedPnLPercentage,
        };
      }
      return position;
    });
  }, [positionsData?.positions, livePrices]);

  // Recalculate summary with live prices
  const updatedSummary = useMemo(() => {
    if (!positionsData?.summary) return null;

    const totalCurrentValue = updatedPositions.reduce(
      (sum, pos) => sum + pos.currentValue,
      0
    );
    const totalUnrealizedPnL = updatedPositions.reduce(
      (sum, pos) => sum + pos.unrealizedPnL,
      0
    );
    const profitablePositions = updatedPositions.filter(
      (pos) => pos.unrealizedPnL > 0
    ).length;
    const losingPositions = updatedPositions.filter(
      (pos) => pos.unrealizedPnL < 0
    ).length;
    const averageReturn =
      positionsData.summary.totalInvested > 0
        ? (totalUnrealizedPnL / positionsData.summary.totalInvested) * 100
        : 0;
    const winRate =
      updatedPositions.length > 0
        ? (profitablePositions / updatedPositions.length) * 100
        : 0;

    return {
      ...positionsData.summary,
      totalCurrentValue,
      totalUnrealizedPnL,
      profitablePositions,
      losingPositions,
      averageReturn,
      winRate,
    };
  }, [positionsData?.summary, updatedPositions]);

  useEffect(() => {
    fetchPositionsData();
  }, [filters]);

  const fetchPositionsData = async () => {
    try {
      setError(null);
      if (filters.page === 1 && !refreshing) setLoading(true);

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = user.id || user._id;
      const token = localStorage.getItem("access_token");

      if (!userId || !token) {
        throw new Error("Please log in to view your holdings");
      }

      // Build query parameters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "") {
          params.append(key, value.toString());
        }
      });

      const response = await axios.get(
        `${API_CONFIG.CALC_SERVER}/api/portfolio/${userId}/positions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch positions");
      }

      setPositionsData(data.data || null);
    } catch (error: any) {
      console.error("Failed to fetch positions:", error);
      setError(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key !== "page" ? 1 : value, // Reset to page 1 when changing filters
    }));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPositionsData();
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      search: "",
      profitability: "all",
      sortBy: "currentValue",
      sortOrder: "desc",
      minInvestment: "",
      maxInvestment: "",
      minPnL: "",
      maxPnL: "",
    });
  };

  const exportToCSV = () => {
    if (!positionsData?.positions.length) return;

    const headers = [
      "Symbol",
      "Quantity",
      "Avg Buy Price",
      "Current Price",
      "Total Invested",
      "Current Value",
      "Unrealized P&L",
      "Unrealized P&L %",
    ];

    const csvContent = [
      headers.join(","),
      ...positionsData.positions.map((position) =>
        [
          position.symbol,
          position.quantity,
          position.avgBuyPrice,
          position.currentPrice,
          position.totalInvested,
          position.currentValue,
          position.unrealizedPnL,
          position.unrealizedPnLPercentage,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `holdings_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleHoldingClick = (symbol: string) => {
    router.push(`/market/${symbol.toUpperCase()}`);
  };

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

  if (loading && !positionsData) {
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

  if (error && !positionsData) {
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

  const summary = updatedSummary || positionsData?.summary;
  const pagination = positionsData?.pagination;
  const positions =
    updatedPositions.length > 0
      ? updatedPositions
      : positionsData?.positions || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="lg:pl-64">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Current Holdings
              </h1>
              <div className="text-muted-foreground">
                View and analyze your current positions •{" "}
                {summary?.totalPositions || 0} total holdings
                {pricesConnected && (
                  <Badge variant="outline" className="ml-2">
                    🟢 Live Prices
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={filters.limit.toString()}
                onValueChange={(value) =>
                  handleFilterChange("limit", parseInt(value))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
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
                disabled={!positions.length}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Summary Statistics */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Positions
                  </CardTitle>
                  <TrendingUpDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary.totalPositions}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary.profitablePositions} profitable,{" "}
                    {summary.losingPositions} losing
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Invested
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary.totalInvested)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Original investment
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Current Value
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(summary.totalCurrentValue)}
                  </div>
                  <p className="text-xs text-muted-foreground">Market value</p>
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
                      summary.totalRealizedPnL >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(summary.totalRealizedPnL)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From closed trades
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
                      summary.totalUnrealizedPnL >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(summary.totalUnrealizedPnL)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Open positions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Success Rate
                  </CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary.winRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Profitable positions
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Sorting
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="gap-2"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Advanced Filters
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Basic Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search Symbol</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search symbols..."
                        value={filters.search}
                        onChange={(e) =>
                          handleFilterChange("search", e.target.value)
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Profitability</label>
                    <Select
                      value={filters.profitability}
                      onValueChange={(value) =>
                        handleFilterChange("profitability", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
                        <SelectItem value="profitable">Profitable</SelectItem>
                        <SelectItem value="losing">Losing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort By</label>
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value) =>
                        handleFilterChange("sortBy", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="currentValue">
                          Current Value
                        </SelectItem>
                        <SelectItem value="unrealizedPnL">
                          P&L Amount
                        </SelectItem>
                        <SelectItem value="unrealizedPnLPercentage">
                          P&L %
                        </SelectItem>
                        <SelectItem value="totalInvested">
                          Invested Amount
                        </SelectItem>
                        <SelectItem value="symbol">Symbol</SelectItem>
                        <SelectItem value="quantity">Quantity</SelectItem>
                        <SelectItem value="currentPrice">
                          Current Price
                        </SelectItem>
                        <SelectItem value="avgBuyPrice">
                          Avg Buy Price
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Order</label>
                    <Select
                      value={filters.sortOrder}
                      onValueChange={(value) =>
                        handleFilterChange("sortOrder", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Highest First</SelectItem>
                        <SelectItem value="asc">Lowest First</SelectItem>
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
                      Clear All
                    </Button>
                  </div>
                </div>

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">
                      Advanced Filters
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Min Investment
                        </label>
                        <Input
                          placeholder="0"
                          type="number"
                          value={filters.minInvestment}
                          onChange={(e) =>
                            handleFilterChange("minInvestment", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Max Investment
                        </label>
                        <Input
                          placeholder="No limit"
                          type="number"
                          value={filters.maxInvestment}
                          onChange={(e) =>
                            handleFilterChange("maxInvestment", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Min P&L</label>
                        <Input
                          placeholder="No limit"
                          type="number"
                          value={filters.minPnL}
                          onChange={(e) =>
                            handleFilterChange("minPnL", e.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Max P&L</label>
                        <Input
                          placeholder="No limit"
                          type="number"
                          value={filters.maxPnL}
                          onChange={(e) =>
                            handleFilterChange("maxPnL", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Positions List */}
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpDown className="h-5 w-5" />
                  Current Holdings ({positions.length})
                  {positions.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Click to view details
                    </Badge>
                  )}
                </CardTitle>
                {pagination && (
                  <div className="text-sm text-muted-foreground">
                    Showing{" "}
                    {(pagination.currentPage - 1) * pagination.limit + 1} to{" "}
                    {Math.min(
                      pagination.currentPage * pagination.limit,
                      pagination.totalCount
                    )}{" "}
                    of {pagination.totalCount} positions
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {positions.length > 0 ? (
                <div className="space-y-4">
                  {positions.map((position) => (
                    <div
                      key={position.symbol}
                      onClick={() => handleHoldingClick(position.symbol)}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {position.symbol}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {position.quantity.toLocaleString()} shares @{" "}
                          {formatCurrency(position.avgBuyPrice)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Invested: {formatCurrency(position.totalInvested)}
                        </div>
                        <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to view {position.symbol} details →
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
                          {formatPercentage(position.unrealizedPnLPercentage)})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {summary?.totalPositions === 0 ? (
                    <>
                      <TrendingUpDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">
                        No positions yet
                      </h3>
                      <p>Start trading to see your holdings here.</p>
                    </>
                  ) : (
                    <>
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">
                        No matching positions
                      </h3>
                      <p>No positions match your current filters.</p>
                    </>
                  )}
                </div>
              )}

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleFilterChange("page", pagination.currentPage - 1)
                      }
                      disabled={!pagination.hasPrev}
                      className="gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, pagination.totalPages) },
                        (_, i) => {
                          const pageNum =
                            Math.max(1, pagination.currentPage - 2) + i;
                          if (pageNum > pagination.totalPages) return null;

                          return (
                            <Button
                              key={pageNum}
                              variant={
                                pageNum === pagination.currentPage
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                handleFilterChange("page", pageNum)
                              }
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleFilterChange("page", pagination.currentPage + 1)
                      }
                      disabled={!pagination.hasNext}
                      className="gap-2"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HoldingsPage;
