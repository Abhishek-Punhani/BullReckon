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
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Navigation from "@/components/Navigation";
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
} from "lucide-react";
import axios from "axios";
import { API_CONFIG } from "@/lib/config";

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
  summary: {
    totalPositions: number;
    totalInvested: number;
    totalCurrentValue: number;
    totalUnrealizedPnL: number;
    profitablePositions: number;
    losingPositions: number;
    winRate: number;
    averageReturn: number;
  };
}

const HoldingsPage = () => {
  const [positionsData, setPositionsData] = useState<PositionsData | null>(
    null
  );
  const [filteredPositions, setFilteredPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [profitabilityFilter, setProfitabilityFilter] = useState("all");

  useEffect(() => {
    fetchPositionsData();
  }, []);

  useEffect(() => {
    filterPositions();
  }, [positionsData, searchTerm, profitabilityFilter]);

  const fetchPositionsData = async () => {
    try {
      setError(null);
      if (!refreshing) setLoading(true);

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = user.id || user._id;
      const token = localStorage.getItem("access_token");

      if (!userId || !token) {
        throw new Error("Please log in to view your holdings");
      }

      const response = await axios.get(
        `${API_CONFIG.CALC_SERVER}/api/portfolio/${userId}/positions`,
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

  const filterPositions = () => {
    if (!positionsData?.positions) {
      setFilteredPositions([]);
      return;
    }

    let filtered = [...positionsData.positions];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((position) =>
        position.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by profitability
    if (profitabilityFilter !== "all") {
      filtered = filtered.filter((position) => {
        if (profitabilityFilter === "profitable")
          return position.unrealizedPnL > 0;
        if (profitabilityFilter === "losing") return position.unrealizedPnL < 0;
        return true;
      });
    }

    setFilteredPositions(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPositionsData();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setProfitabilityFilter("all");
  };

  const exportToCSV = () => {
    if (!filteredPositions.length) return;

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
      ...filteredPositions.map((position) =>
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

  const summary = positionsData?.summary;

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
              <p className="text-muted-foreground">
                View and analyze your current positions •{" "}
                {filteredPositions.length} holdings
              </p>
            </div>
            <div className="flex items-center gap-3">
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
                disabled={!filteredPositions.length}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Summary Statistics */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    {formatPercentage(summary.averageReturn)}
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
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <label className="text-sm font-medium">Profitability</label>
                  <Select
                    value={profitabilityFilter}
                    onValueChange={setProfitabilityFilter}
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
                    {filteredPositions.length} of{" "}
                    {positionsData?.positions.length || 0} positions
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="w-full">
            {/* Current Positions */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpDown className="h-5 w-5" />
                  Current Holdings ({filteredPositions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPositions.length > 0 ? (
                  <div className="space-y-4">
                    {filteredPositions.map((position) => (
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
                ) : positionsData?.positions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No positions yet. Start trading to see your holdings here.
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No positions match your current filters.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HoldingsPage;
