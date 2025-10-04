"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCentralPrices } from "@/hooks/use-centralPrice";
import MarketChart from "@/components/MarketCharts";
import type {
  StockQuote,
  StockHistoricalData,
} from "../../../lib/types/market";
import { marketService, tradeService } from "@/services";
import {
  ArrowLeft,
  Building2,
  Globe,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  AlertCircle,
  Package,
  Users,
} from "lucide-react";

const PERIODS = [
  { value: "1d", label: "1D" },
  { value: "5d", label: "5D" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "5y", label: "5Y" },
  { value: "max", label: "Max" },
];

export default function SymbolPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const rawSymbol = Array.isArray(params.symbol)
    ? params.symbol[0]
    : params.symbol;
  const symbol = useMemo(() => rawSymbol?.toUpperCase(), [rawSymbol]);
  const symbols = useMemo(() => (symbol ? [symbol] : []), [symbol]);

  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("1y");
  const [historical, setHistorical] = useState<StockHistoricalData | null>(
    null
  );
  const [companyInfo, setCompanyInfo] = useState<{
    profile?: {
      longBusinessSummary?: string;
      city?: string;
      state?: string;
      website?: string;
      fullTimeEmployees?: number;
    };
  } | null>(null);
  const [holdings, setHoldings] = useState<{
    symbol: string;
    quantity: number;
    avgBuyPrice: number;
    currentValue?: number;
    totalInvested: number;
    unrealizedPnL?: number;
    unrealizedPnLPercentage?: number;
  } | null>(null);

  // Trading form state
  const [orderType, setOrderType] = useState("market");
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [takeProfitPrice, setTakeProfitPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Subscribe to live prices
  const { prices: livePrices } = useCentralPrices({
    symbols,
    enabled: !!symbol,
  });

  const currentPrice = useMemo(() => {
    if (!symbol) return 0;
    return livePrices[symbol]?.price || quote?.data?.price || 0;
  }, [livePrices, symbol, quote]);

  useEffect(() => {
    const fetchData = async () => {
      if (!symbol) {
        setError("No symbol provided");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [quoteData, historicalData, companyData, holdingsData] =
          await Promise.allSettled([
            marketService.getQuote(symbol),
            marketService.getHistoricalData(symbol, selectedPeriod, "1d"),
            marketService.getCompanyInfo(symbol),
            marketService.getHoldings(symbol),
          ]);

        if (quoteData.status === "fulfilled" && quoteData.value?.data) {
          setQuote(quoteData.value);
        } else {
          setError(`No data found for symbol: ${symbol}`);
        }

        if (historicalData.status === "fulfilled") {
          setHistorical(historicalData.value);
        }

        if (companyData.status === "fulfilled" && companyData.value?.data) {
          setCompanyInfo(companyData.value.data);
        }

        if (holdingsData.status === "fulfilled") {
          setHoldings(holdingsData.value);
        }
      } catch (err: unknown) {
        console.error("Failed to fetch data:", err);
        setError(
          err instanceof Error
            ? err.message
            : `Failed to load data for ${symbol}`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, selectedPeriod]);

  useEffect(() => {
    if (symbol && quote?.data?.name) {
      document.title = `${quote.data.name} (${symbol}) - BullReckon`;
    } else if (symbol) {
      document.title = `${symbol} - BullReckon`;
    }
    return () => {
      document.title = "BullReckon - Trading Platform";
    };
  }, [symbol, quote]);

  const handleBack = () => router.push("/market");

  const handleTrade = async (action: "BUY" | "SELL") => {
    if (!symbol) return;

    if (!currentPrice) {
      toast({
        title: "Error",
        description: "Could not get current price.",
        variant: "destructive",
      });
      return;
    }

    if (quantity <= 0) {
      toast({
        title: "Error",
        description: "Quantity must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    // Check holdings for sell orders
    if (action === "SELL") {
      if (!holdings || holdings.quantity < quantity) {
        toast({
          title: "Insufficient Holdings",
          description: `You don't have enough ${symbol} to sell. Available: ${holdings?.quantity || 0}`,
          variant: "destructive",
        });
        return;
      }
    }

    if (orderType === "limit" && (!limitPrice || Number(limitPrice) <= 0)) {
      toast({
        title: "Error",
        description: "Please enter a valid limit price.",
        variant: "destructive",
      });
      return;
    }

    if (orderType === "stop" && (!stopPrice || Number(stopPrice) <= 0)) {
      toast({
        title: "Error",
        description: "Please enter a valid stop price.",
        variant: "destructive",
      });
      return;
    }

    let source = "market";
    if (orderType === "limit") source = "limit";
    else if (orderType === "stop") source = "stop_loss";
    else if (orderType === "take_profit") source = "take_profit";

    const orderDetails: any = {
      symbol,
      quantity,
      action,
      source,
    };

    // Add price fields based on order type
    if (orderType === "limit" && limitPrice) {
      orderDetails.limitPrice = Number(limitPrice);
    }

    if (orderType === "stop" && stopPrice) {
      orderDetails.stopPrice = Number(stopPrice);
    }

    if (orderType === "take_profit" && takeProfitPrice) {
      orderDetails.stopPrice = Number(takeProfitPrice);
    }

    // CRITICAL: For market/limit orders, if user sets SL/TP in the optional fields, add them
    // These will create separate pending SELL orders after the main order executes
    if ((orderType === "market" || orderType === "limit") && action === "BUY") {
      if (stopPrice && Number(stopPrice) > 0) {
        orderDetails.stopLoss = Number(stopPrice);
      }
      if (takeProfitPrice && Number(takeProfitPrice) > 0) {
        orderDetails.takeProfit = Number(takeProfitPrice);
      }
    }

    setSubmitting(true);
    try {
      const result = await tradeService.placeOrder(orderDetails);

      // Show success message with details about pending orders
      const pendingCount = result?.data?.pendingOrders || 0;
      const baseMessage = `${action} ${quantity} ${symbol} at ${orderType === "market" ? "market price" : orderType === "limit" ? `$${limitPrice}` : `stop $${stopPrice}`}`;
      const fullMessage =
        pendingCount > 0
          ? `${baseMessage} with ${pendingCount} pending order(s) (SL/TP)`
          : baseMessage;

      toast({
        title: "Order Placed Successfully",
        description: fullMessage,
      });

      // Refresh holdings
      const updatedHoldings = await marketService.getHoldings(symbol);
      setHoldings(updatedHoldings);

      // Reset form
      setQuantity(1);
      setLimitPrice("");
      setStopPrice("");
      setTakeProfitPrice("");
    } catch (error: unknown) {
      toast({
        title: "Order Failed",
        description:
          error instanceof Error ? error.message : "Failed to place order",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading {symbol} data...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold text-destructive">
            Unable to Load Symbol
          </h1>
          <p className="text-muted-foreground">{error}</p>
          <div className="space-y-2">
            <Button onClick={handleBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Market
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const change = quote.data.change || 0;
  const changePercent = quote.data.changePercent || 0;
  const isPositive = change >= 0;
  const companyName =
    quote.data.name || (symbol ? marketService.getSymbolName(symbol) : "");
  const orderValue = currentPrice * quantity;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{companyName}</h1>
                <p className="text-sm text-muted-foreground">{symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold font-mono">
                $
                {currentPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div
                className={`flex items-center gap-1 justify-end ${isPositive ? "text-green-600" : "text-red-600"}`}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-semibold">
                  {isPositive ? "+" : ""}${change.toFixed(2)} (
                  {isPositive ? "+" : ""}
                  {changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Holdings Section - Show only if user has holdings */}
        {holdings && holdings.quantity > 0 && (
          <section id="holdings" className="scroll-mt-20">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Your Holdings
            </h2>
            <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 shadow-lg">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">
                      Quantity
                    </p>
                    <p className="text-3xl font-bold">
                      {holdings.quantity.toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">
                      Avg. Buy Price
                    </p>
                    <p className="text-3xl font-bold">
                      ${holdings.avgBuyPrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">
                      Current Value
                    </p>
                    <p className="text-3xl font-bold">
                      $
                      {(holdings.quantity * currentPrice).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">
                      Profit/Loss
                    </p>
                    <p
                      className={`text-3xl font-bold ${holdings.quantity * currentPrice - holdings.totalInvested >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      $
                      {(
                        holdings.quantity * currentPrice -
                        holdings.totalInvested
                      ).toFixed(2)}
                      <span className="text-lg ml-2">
                        (
                        {(
                          ((holdings.quantity * currentPrice -
                            holdings.totalInvested) /
                            holdings.totalInvested) *
                          100
                        ).toFixed(2)}
                        %)
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Chart & Trading Section */}
        <section id="trading" className="scroll-mt-20">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Price Chart & Trading
          </h2>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Price Chart</CardTitle>
                    <Select
                      value={selectedPeriod}
                      onValueChange={setSelectedPeriod}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIODS.map((period) => (
                          <SelectItem key={period.value} value={period.value}>
                            {period.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-[500px] flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-muted-foreground">
                          Loading chart...
                        </p>
                      </div>
                    </div>
                  ) : historical ? (
                    <MarketChart historical={historical} height={500} />
                  ) : (
                    <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                      No chart data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Trading Panel */}
            <div className="lg:col-span-1">
              <Card className="shadow-lg sticky top-24">
                <CardHeader className="bg-gradient-to-br from-primary/5 to-background">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Trade {symbol}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="orderType">Order Type</Label>
                    <Select value={orderType} onValueChange={setOrderType}>
                      <SelectTrigger id="orderType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="market">Market Order</SelectItem>
                        <SelectItem value="limit">Limit Order</SelectItem>
                        <SelectItem value="stop">Stop Loss</SelectItem>
                        <SelectItem value="take_profit">Take Profit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="text-lg font-semibold"
                    />
                  </div>

                  {orderType === "limit" && (
                    <div className="space-y-2">
                      <Label htmlFor="limitPrice">Limit Price</Label>
                      <Input
                        id="limitPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        placeholder={currentPrice.toFixed(2)}
                        className="text-lg font-semibold"
                      />
                    </div>
                  )}

                  {orderType === "stop" && (
                    <div className="space-y-2">
                      <Label htmlFor="stopPriceMain">Stop Loss Price</Label>
                      <Input
                        id="stopPriceMain"
                        type="number"
                        min="0"
                        step="0.01"
                        value={stopPrice}
                        onChange={(e) => setStopPrice(e.target.value)}
                        placeholder={currentPrice.toFixed(2)}
                        className="text-lg font-semibold"
                      />
                    </div>
                  )}

                  {orderType === "take_profit" && (
                    <div className="space-y-2">
                      <Label htmlFor="takeProfitPriceMain">
                        Take Profit Price
                      </Label>
                      <Input
                        id="takeProfitPriceMain"
                        type="number"
                        min="0"
                        step="0.01"
                        value={takeProfitPrice}
                        onChange={(e) => setTakeProfitPrice(e.target.value)}
                        placeholder={currentPrice.toFixed(2)}
                        className="text-lg font-semibold"
                      />
                    </div>
                  )}

                  {/* Only show optional SL/TP for market and limit orders */}
                  {(orderType === "market" || orderType === "limit") && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor="stopPrice" className="text-xs">
                          Stop Loss (optional)
                        </Label>
                        <Input
                          id="stopPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          value={stopPrice}
                          onChange={(e) => setStopPrice(e.target.value)}
                          placeholder={(currentPrice * 0.95).toFixed(2)}
                          className="text-sm font-semibold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="takeProfitPrice" className="text-xs">
                          Take Profit (optional)
                        </Label>
                        <Input
                          id="takeProfitPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          value={takeProfitPrice}
                          onChange={(e) => setTakeProfitPrice(e.target.value)}
                          placeholder={(currentPrice * 1.05).toFixed(2)}
                          className="text-sm font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-muted/50 rounded-lg space-y-2 border border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Order Value:
                      </span>
                      <span className="font-bold text-lg">
                        ${orderValue.toFixed(2)}
                      </span>
                    </div>
                    {holdings && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Available:
                        </span>
                        <span className="font-semibold">
                          {holdings.quantity} shares
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                      onClick={() => handleTrade("BUY")}
                      disabled={submitting}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-lg"
                      size="lg"
                    >
                      {submitting ? "Processing..." : "Buy"}
                    </Button>
                    <Button
                      onClick={() => handleTrade("SELL")}
                      disabled={
                        submitting || !holdings || holdings.quantity < quantity
                      }
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 text-lg disabled:opacity-50"
                      size="lg"
                    >
                      {submitting ? "Processing..." : "Sell"}
                    </Button>
                  </div>

                  {!holdings && (
                    <p className="text-xs text-center text-muted-foreground pt-2">
                      You don&apos;t own any {symbol} shares
                    </p>
                  )}
                  {holdings && holdings.quantity < quantity && (
                    <p className="text-xs text-center text-red-600 pt-2">
                      Insufficient shares to sell ({holdings.quantity}{" "}
                      available)
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Key Statistics Section */}
        <section id="statistics" className="scroll-mt-20">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Key Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground font-medium">
                    Market Cap
                  </p>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {quote.data.marketCap
                    ? quote.data.marketCap >= 1e12
                      ? `$${(quote.data.marketCap / 1e12).toFixed(2)}T`
                      : quote.data.marketCap >= 1e9
                        ? `$${(quote.data.marketCap / 1e9).toFixed(2)}B`
                        : `$${(quote.data.marketCap / 1e6).toFixed(2)}M`
                    : "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground font-medium">
                    P/E Ratio
                  </p>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {quote.data.pe ? quote.data.pe.toFixed(2) : "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground font-medium">
                    Day High
                  </p>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  ${quote.data.dayHigh?.toFixed(2) || "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground font-medium">
                    Day Low
                  </p>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  ${quote.data.dayLow?.toFixed(2) || "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground font-medium">
                    Volume
                  </p>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {quote.data.volume
                    ? quote.data.volume.toLocaleString()
                    : "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground font-medium">
                    52W High
                  </p>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {(quote.data as unknown as Record<string, number | undefined>)
                    .fiftyTwoWeekHigh
                    ? `$${((quote.data as unknown as Record<string, number | undefined>).fiftyTwoWeekHigh as number).toFixed(2)}`
                    : "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground font-medium">
                    52W Low
                  </p>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {(quote.data as unknown as Record<string, number | undefined>)
                    .fiftyTwoWeekLow
                    ? `$${((quote.data as unknown as Record<string, number | undefined>).fiftyTwoWeekLow as number).toFixed(2)}`
                    : "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground font-medium">
                    Avg Volume
                  </p>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {(quote.data as unknown as Record<string, number | undefined>)
                    .avgVolume
                    ? (
                        (
                          quote.data as unknown as Record<
                            string,
                            number | undefined
                          >
                        ).avgVolume as number
                      ).toLocaleString()
                    : "N/A"}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Company Overview Section */}
        {companyInfo && (
          <section id="company-info" className="scroll-mt-20">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Company Overview
            </h2>
            <Card className="shadow-lg">
              <CardContent className="pt-6 space-y-6">
                {companyInfo.profile?.longBusinessSummary && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">About</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {companyInfo.profile.longBusinessSummary}
                    </p>
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-border">
                  {companyInfo.profile?.city && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground block">
                          Headquarters
                        </span>
                        <span className="text-base font-semibold">
                          {companyInfo.profile.city},{" "}
                          {companyInfo.profile.state}
                        </span>
                      </div>
                    </div>
                  )}
                  {companyInfo.profile?.website && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground block">
                          Website
                        </span>
                        <a
                          href={companyInfo.profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-semibold text-primary hover:underline"
                        >
                          {companyInfo.profile.website.replace(
                            /^https?:\/\/(www\.)?/,
                            ""
                          )}
                        </a>
                      </div>
                    </div>
                  )}
                  {companyInfo.profile?.fullTimeEmployees && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground block">
                          Employees
                        </span>
                        <span className="text-base font-semibold">
                          {companyInfo.profile.fullTimeEmployees.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
