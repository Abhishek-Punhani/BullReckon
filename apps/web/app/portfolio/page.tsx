"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  PieChart,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { apiService, authService } from "@/services";
import Navigation from "@/components/Navigation";

interface Position {
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  currency: string;
}

interface Portfolio {
  userId: string;
  totalValue: number;
  cash: number;
  positions: Position[];
}

const PortfolioPage = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("auth/login");
      return;
    }
    loadPortfolio();
  }, [router]);

  const loadPortfolio = async () => {
    setIsLoading(true);
    try {
      const user = authService.getUser();
      const token = authService.getToken();
      if (!user || !token) return;
      const data = await apiService.getPortfolio(user.id, token);
      setPortfolio(data);
    } catch (error) {
      setPortfolio(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPortfolio = async () => {
    setIsRefreshing(true);
    await loadPortfolio();
    setIsRefreshing(false);
  };

  const formatPrice = (price: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Loading portfolio...</p>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-8 text-center">
            <Wallet className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="mb-2">No portfolio data found.</p>
            <Button onClick={refreshPortfolio}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPnL = portfolio.positions.reduce(
    (sum, pos) => sum + pos.unrealizedPnL,
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
              <h1 className="text-3xl font-bold">Portfolio</h1>
              <p className="text-muted-foreground">
                Your current holdings and performance
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={refreshPortfolio}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Badge
                variant={isProfitable ? "default" : "destructive"}
                className="px-3 py-1"
              >
                {isProfitable ? "Profitable" : "Loss"}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Value
                </CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPrice(portfolio.totalValue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Portfolio market value
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPrice(portfolio.cash)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Available for trading
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Unrealized P&L
                </CardTitle>
                {isProfitable ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${isProfitable ? "text-green-600" : "text-red-600"}`}
                >
                  {isProfitable ? "+" : ""}
                  {formatPrice(totalPnL)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unrealized profit/loss
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Positions</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {portfolio.positions.length}
                </div>
                <p className="text-xs text-muted-foreground">Active holdings</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Current Positions</CardTitle>
              <CardDescription>Details of your active holdings</CardDescription>
            </CardHeader>
            <CardContent>
              {portfolio.positions.length > 0 ? (
                <div className="space-y-4">
                  {portfolio.positions.map((pos) => (
                    <div
                      key={pos.symbol}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{pos.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          {pos.quantity} @{" "}
                          {formatPrice(pos.avgBuyPrice, pos.currency)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatPrice(
                            pos.currentPrice * pos.quantity,
                            pos.currency
                          )}
                        </div>
                        <div
                          className={`text-sm ${pos.unrealizedPnL >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {pos.unrealizedPnL >= 0 ? "+" : ""}
                          {formatPrice(pos.unrealizedPnL, pos.currency)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active positions.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PortfolioPage;
