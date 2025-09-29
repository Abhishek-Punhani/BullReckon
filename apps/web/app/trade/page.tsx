"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { authService, marketService } from "@/lib/services";
import Navigation from "@/components/Navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Search,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  Clock,
  AlertCircle,
  Wallet,
} from "lucide-react";

interface Quote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  shortName: string;
  currency: string;
  bid?: number;
  ask?: number;
  volume?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

interface OrderData {
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop";
  quantity: number;
  price?: number;
  stopPrice?: number;
}

const TradingPage = () => {
  const [currentSymbol, setCurrentSymbol] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [orderData, setOrderData] = useState<OrderData>({
    symbol: "",
    side: "buy",
    type: "market",
    quantity: 0,
    price: 0,
  });

  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check authentication
    if (!authService.isAuthenticated()) {
      router.push("/auth/login");
      return;
    }

    // Get symbol from URL params
    const symbol = searchParams?.get("symbol");
    if (symbol) {
      setCurrentSymbol(symbol);
      loadQuoteData(symbol);
    }
  }, [router, searchParams]);

  const loadQuoteData = async (symbol: string) => {
    if (!symbol) return;

    setIsLoading(true);
    try {
      const [quoteData, historicalData] = await Promise.all([
        marketService.getQuote(symbol),
        marketService.getHistoricalData(symbol, "1mo", "1d").catch(() => []),
      ]);

      setQuote(quoteData);
      setHistoricalData(historicalData || []);
      setOrderData((prev) => ({
        ...prev,
        symbol,
        price: quoteData.regularMarketPrice,
      }));
    } catch (error) {
      console.error("Failed to load quote data:", error);
      toast({
        title: "Error",
        description: `Failed to load data for ${symbol}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await marketService.searchSymbols(searchQuery);
      setSearchResults(results || []);
    } catch (error) {
      console.error("Search failed:", error);
      toast({
        title: "Search Failed",
        description: "Unable to search for symbols. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const selectSymbol = (symbol: string) => {
    setCurrentSymbol(symbol);
    loadQuoteData(symbol);
    setSearchResults([]);
    setSearchQuery("");
  };

  const calculateOrderValue = () => {
    if (orderData.type === "market") {
      return (quote?.regularMarketPrice || 0) * orderData.quantity;
    }
    return (orderData.price || 0) * orderData.quantity;
  };

  const handlePlaceOrder = async () => {
    if (!orderData.symbol || !orderData.quantity) {
      toast({
        title: "Invalid Order",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // This would normally connect to your trading API
    toast({
      title: "Paper Trade Placed",
      description: `${orderData.side.toUpperCase()} ${orderData.quantity} shares of ${orderData.symbol} at ${orderData.type} order`,
    });

    // Reset form
    setOrderData((prev) => ({
      ...prev,
      quantity: 0,
      price: quote?.regularMarketPrice || 0,
    }));
  };

  // Hydration-safe formatting
  const [formatter, setFormatter] = useState<
    (price: number | undefined | null, currency?: string) => string
  >(() => (price: number | undefined | null, currency = "USD") => {
    if (price === undefined || price === null || isNaN(price)) {
      return "$0.00";
    }
    return price.toFixed(2);
  });
  useEffect(() => {
    setFormatter(
      () =>
        (price: number | undefined | null, currency: string = "USD") => {
          if (price === undefined || price === null || isNaN(price)) {
            return new Intl.NumberFormat("en-US", {
              style: "currency",
              currency,
            }).format(0);
          }
          return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
          }).format(price);
        }
    );
  }, []);

  const formatPrice = (price: number, currency: string = "USD") =>
    formatter(price, currency);

  const formatPercent = (percent: number | undefined | null) => {
    if (percent === undefined || percent === null || isNaN(percent)) {
      return "0.00%";
    }
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
  };

  const formatVolume = (volume: number | undefined | null) => {
    if (volume === undefined || volume === null || isNaN(volume)) {
      return "0";
    }
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="lg:pl-64">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Trading</h1>
              <p className="text-muted-foreground">
                Execute trades and analyze market data
              </p>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              <Clock className="h-4 w-4 mr-2" />
              Paper Trading
            </Badge>
          </div>

          {/* Search Bar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Symbol Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Search for stocks (e.g., AAPL, Tesla, Microsoft)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search
                </Button>
              </form>

              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold">Search Results:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {searchResults.slice(0, 6).map((result: any) => (
                      <Card
                        key={result.symbol}
                        className="cursor-pointer hover:shadow-md"
                        onClick={() => selectSymbol(result.symbol)}
                      >
                        <CardContent className="p-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold">{result.symbol}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {result.shortname || result.longname}
                              </p>
                            </div>
                            <Button size="sm" variant="outline">
                              Select
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {currentSymbol && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stock Information */}
              <div className="lg:col-span-2 space-y-6">
                {/* Quote Card */}
                {quote && (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-2xl">
                            {quote.symbol}
                          </CardTitle>
                          <CardDescription>{quote.shortName}</CardDescription>
                        </div>
                        <Badge variant="outline">{quote.currency}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">
                            Last Price
                          </Label>
                          <p className="text-2xl font-bold">
                            {formatPrice(quote.regularMarketPrice)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">
                            Change
                          </Label>
                          <div
                            className={`flex items-center gap-1 ${quote.regularMarketChange >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {quote.regularMarketChange >= 0 ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                            <span className="font-semibold">
                              {formatPrice(Math.abs(quote.regularMarketChange))}{" "}
                              ({formatPercent(quote.regularMarketChangePercent)}
                              )
                            </span>
                          </div>
                        </div>
                        {quote.bid && (
                          <div>
                            <Label className="text-sm text-muted-foreground">
                              Bid
                            </Label>
                            <p className="font-semibold">
                              {formatPrice(quote.bid)}
                            </p>
                          </div>
                        )}
                        {quote.ask && (
                          <div>
                            <Label className="text-sm text-muted-foreground">
                              Ask
                            </Label>
                            <p className="font-semibold">
                              {formatPrice(quote.ask)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                        {quote.volume && (
                          <div>
                            <Label className="text-sm text-muted-foreground">
                              Volume
                            </Label>
                            <p className="font-semibold">
                              {formatVolume(quote.volume)}
                            </p>
                          </div>
                        )}
                        {quote.marketCap && (
                          <div>
                            <Label className="text-sm text-muted-foreground">
                              Market Cap
                            </Label>
                            <p className="font-semibold">
                              {formatPrice(quote.marketCap)}
                            </p>
                          </div>
                        )}
                        {quote.fiftyTwoWeekHigh && (
                          <div>
                            <Label className="text-sm text-muted-foreground">
                              52W High
                            </Label>
                            <p className="font-semibold">
                              {formatPrice(quote.fiftyTwoWeekHigh)}
                            </p>
                          </div>
                        )}
                        {quote.fiftyTwoWeekLow && (
                          <div>
                            <Label className="text-sm text-muted-foreground">
                              52W Low
                            </Label>
                            <p className="font-semibold">
                              {formatPrice(quote.fiftyTwoWeekLow)}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Chart Placeholder */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Price Chart
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Interactive chart will be displayed here
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Real-time price data with technical indicators
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Trading Panel */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Place Order
                    </CardTitle>
                    <CardDescription>
                      Paper trading - no real money involved
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Tabs
                      value={orderData.side}
                      onValueChange={(value) =>
                        setOrderData((prev) => ({
                          ...prev,
                          side: value as "buy" | "sell",
                        }))
                      }
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="buy" className="text-green-600">
                          Buy
                        </TabsTrigger>
                        <TabsTrigger value="sell" className="text-red-600">
                          Sell
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value={orderData.side} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Order Type</Label>
                          <Select
                            value={orderData.type}
                            onValueChange={(value) =>
                              setOrderData((prev) => ({
                                ...prev,
                                type: value as "market" | "limit" | "stop",
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="market">
                                Market Order
                              </SelectItem>
                              <SelectItem value="limit">Limit Order</SelectItem>
                              <SelectItem value="stop">Stop Order</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            placeholder="Number of shares"
                            value={orderData.quantity || ""}
                            onChange={(e) =>
                              setOrderData((prev) => ({
                                ...prev,
                                quantity: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>

                        {orderData.type !== "market" && (
                          <div className="space-y-2">
                            <Label>
                              {orderData.type === "limit"
                                ? "Limit Price"
                                : "Stop Price"}
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Price per share"
                              value={orderData.price || ""}
                              onChange={(e) =>
                                setOrderData((prev) => ({
                                  ...prev,
                                  price: parseFloat(e.target.value) || 0,
                                }))
                              }
                            />
                          </div>
                        )}

                        <div className="p-3 bg-muted rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Estimated Value:</span>
                            <span className="font-semibold">
                              {formatPrice(calculateOrderValue())}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Order Type:</span>
                            <span className="font-semibold capitalize">
                              {orderData.type}
                            </span>
                          </div>
                        </div>

                        <Button
                          onClick={handlePlaceOrder}
                          className={`w-full ${orderData.side === "buy" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                          disabled={!orderData.quantity}
                        >
                          Place {orderData.side.toUpperCase()} Order
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Position Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Account Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Buying Power:
                      </span>
                      <span className="font-semibold">
                        {formatPrice(50000)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Portfolio Value:
                      </span>
                      <span className="font-semibold">
                        {formatPrice(112500)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Day P&L:
                      </span>
                      <span className="font-semibold text-green-600">
                        +{formatPrice(2345)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Warning */}
                <Card className="border-yellow-500/50 bg-yellow-500/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-yellow-700 dark:text-yellow-400">
                          Paper Trading Mode
                        </p>
                        <p className="text-muted-foreground">
                          This is a simulation. No real trades are being
                          executed. All positions and P&L are virtual for
                          learning purposes.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* No Symbol Selected */}
          {!currentSymbol && (
            <Card className="h-96">
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Search className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
                  <h3 className="text-lg font-semibold mb-2">
                    Select a Symbol to Trade
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Use the search bar above to find stocks, ETFs, or other
                    securities
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"].map((symbol) => (
                      <Button
                        key={symbol}
                        variant="outline"
                        size="sm"
                        onClick={() => selectSymbol(symbol)}
                      >
                        {symbol}
                      </Button>
                    ))}
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

export default TradingPage;
