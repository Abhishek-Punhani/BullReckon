"use client";
import React, { useEffect, useState } from "react";
import MarketChart from "../../components/MarketCharts";
import TradingTools from "../../components/TradingTools";
import type { StockHistoricalData, StockQuote } from "../../lib/types/market";
import SymbolSearch from "../../components/SymbolSearch";
import Navigation from "@/components/Navigation";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Globe,
  DollarSign,
  Bitcoin,
  Gem,
} from "lucide-react";
import { marketService } from "@/services";
import { MARKET_CATEGORIES, type MarketAsset } from "@/lib/mockData";

const PERIODS = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "ytd", label: "YTD" },
  { value: "5y", label: "5Y" },
  { value: "max", label: "Max" },
];

const categoryIcons = {
  indices: <Globe className="h-6 w-6" />,
  stocks: <DollarSign className="h-6 w-6" />,
  crypto: <Bitcoin className="h-6 w-6" />,
  commodities: <Gem className="h-6 w-6" />,
};

type Category = keyof typeof MARKET_CATEGORIES;

export default function MarketPage() {
  const [isClient, setIsClient] = useState(false);
  const [symbol, setSymbol] = useState<string>("AAPL");
  const [period, setPeriod] = useState<string>("1y");
  const [historical, setHistorical] = useState<StockHistoricalData | null>(
    null
  );
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category>("stocks");
  const [assetList, setAssetList] = useState<
    { symbol: string; price: number; change: number; name: string }[]
  >([]);
  const [globalStats, setGlobalStats] = useState<
    {
      symbol: string;
      price: number;
      change: number;
      name: string;
      icon: string;
    }[]
  >([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);

    // Fetch global stats for indices
    const fetchGlobalStats = async () => {
      setStatsLoading(true);
      const indices = MARKET_CATEGORIES["indices"].slice(0, 4);
      const symbols = indices.map((index) => index.value);

      try {
        const quotesData = await marketService.getBatchQuotes(symbols);

        // Only create stats for successfully fetched quotes
        const statsData = quotesData
          .map((quote, index) => {
            if (!quote || !quote.data) return null;

            const data = quote.data;
            return {
              symbol: indices[index].value,
              name: indices[index].label,
              price: data.price ?? 0,
              change: data.changePercent ?? 0,
              icon: indices[index].icon,
            };
          })
          .filter(
            (item): item is NonNullable<typeof item> =>
              item !== null && item.price > 0
          ); // Remove null entries and zero prices

        setGlobalStats(statsData);
      } catch (error) {
        console.error("Failed to fetch global stats:", error);
        setGlobalStats([]);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchGlobalStats();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [data, quoteData] = await Promise.allSettled([
          marketService.getHistoricalData(symbol, period, "1d"),
          marketService.getQuote(symbol),
        ]);

        if (cancelled) return;

        // Handle historical data
        if (data.status === "fulfilled") {
          setHistorical(data.value);
        } else {
          console.error("Failed to fetch historical data:", data.reason);
          setHistorical(null);
        }

        // Handle quote data
        if (quoteData.status === "fulfilled" && quoteData.value) {
          setQuote(quoteData.value);
        } else {
          console.error(
            "Failed to fetch quote data:",
            quoteData.status === "rejected" ? quoteData.reason : "No data"
          );
          setQuote(null);
        }

        // Set error only if both requests failed
        if (data.status === "rejected" && quoteData.status === "rejected") {
          setError(`Failed to load market data for ${symbol}`);
        } else if (data.status === "rejected") {
          setError(`Failed to load historical data for ${symbol}`);
        } else if (quoteData.status === "rejected") {
          setError(`Failed to load current quote for ${symbol}`);
        }
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to load market data");
        setHistorical(null);
        setQuote(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [symbol, period]);

  useEffect(() => {
    const fetchCategoryAssets = async () => {
      if (!isClient) return; // Don't fetch on server side

      setAssetsLoading(true);
      const assets = MARKET_CATEGORIES[selectedCategory];
      const symbols = assets.map((asset) => asset.value);

      try {
        const quotesData = await marketService.getBatchQuotes(symbols);

        // Only create asset data for successfully fetched quotes
        const assetData = quotesData
          .map((quote, index) => {
            if (!quote || !quote.data) return null;

            const data = quote.data;
            return {
              symbol: assets[index].value,
              name: data.name || assets[index].label,
              price: data.price ?? 0,
              change: data.changePercent ?? 0,
            };
          })
          .filter(
            (item): item is NonNullable<typeof item> =>
              item !== null && item.price > 0
          ); // Remove null entries and zero prices

        setAssetList(assetData);
      } catch (error) {
        console.error(`Failed to fetch ${selectedCategory} assets:`, error);
        setAssetList([]);
      } finally {
        setAssetsLoading(false);
      }
    };

    fetchCategoryAssets();
  }, [selectedCategory, isClient]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="lg:pl-64">
        <div className="p-6 space-y-6">
          {/* Hero Section */}
          <div className="bg-card border rounded-lg p-8 text-center trading-gradient">
            <h1 className="text-4xl font-bold">Explore the Market</h1>
            <p className="text-muted-foreground mt-2">
              Find your next investment opportunity with real-time data and
              insights.
            </p>
            <div className="mt-6 max-w-md mx-auto">
              <SymbolSearch onSelect={(sym) => setSymbol(sym)} />
            </div>
          </div>

          {/* Global Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statsLoading
              ? // Loading skeleton
                Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Loading...
                      </CardTitle>
                      <span className="text-2xl">📊</span>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">Loading...</div>
                      <p className="text-xs text-muted-foreground">
                        Please wait...
                      </p>
                    </CardContent>
                  </Card>
                ))
              : globalStats.map((stat) => (
                  <Card key={stat.symbol}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.name}
                      </CardTitle>
                      <span className="text-2xl">{stat.icon}</span>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {stat.price > 0 ? `$${stat.price.toFixed(2)}` : "N/A"}
                      </div>
                      <p
                        className={`text-xs ${
                          stat.change >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {stat.change !== 0
                          ? `${stat.change > 0 ? "+" : ""}${stat.change.toFixed(2)}%`
                          : "N/A"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
          </div>

          <div className="space-y-6">
            {/* Main Chart Section - Full Width */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl">
                      {quote?.data?.name || marketService.getSymbolName(symbol)}{" "}
                      ({symbol})
                    </CardTitle>
                    <CardDescription>
                      {quote?.data?.price
                        ? `$${quote.data.price.toFixed(2)} ${
                            quote.data.change >= 0 ? "+" : ""
                          }${quote.data.change?.toFixed(2)} (${quote.data.changePercent?.toFixed(2)}%)`
                        : "Loading price..."}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PERIODS.map((p) => (
                      <Button
                        key={p.value}
                        variant={period === p.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPeriod(p.value)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[500px] flex items-center justify-center">
                    <div>Loading chart data...</div>
                  </div>
                ) : error ? (
                  <div className="h-[500px] flex items-center justify-center">
                    <div className="text-destructive">{error}</div>
                  </div>
                ) : (
                  <div className="w-full" style={{ height: "500px" }}>
                    <MarketChart
                      key={`chart-${symbol}-${period}`}
                      historical={historical}
                      height={500}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bottom Section: Stock List and Trading Tools */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Asset List */}
              <div className="lg:col-span-2">
                <Card>
                  <Tabs
                    defaultValue="stocks"
                    className="w-full"
                    onValueChange={(v) => setSelectedCategory(v as Category)}
                    suppressHydrationWarning
                  >
                    <TabsList className="grid w-full grid-cols-4">
                      {Object.keys(MARKET_CATEGORIES).map((cat) => (
                        <TabsTrigger
                          key={cat}
                          value={cat}
                          className="capitalize"
                        >
                          {cat}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <TabsContent value={selectedCategory} className="mt-0">
                      <div className="space-y-2 p-4 max-h-[400px] overflow-y-auto">
                        {isClient &&
                          assetList.map((asset) => (
                            <div
                              key={asset.symbol}
                              className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors ${
                                symbol === asset.symbol ? "bg-muted border" : ""
                              }`}
                              onClick={() => setSymbol(asset.symbol)}
                              suppressHydrationWarning
                            >
                              <div>
                                <p className="font-semibold">{asset.symbol}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {asset.name}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold">
                                  ${asset.price.toFixed(2)}
                                </p>
                                <p
                                  className={`text-sm ${
                                    asset.change >= 0
                                      ? "text-success"
                                      : "text-destructive"
                                  }`}
                                >
                                  {asset.change > 0 ? "+" : ""}
                                  {asset.change.toFixed(2)}%
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </Card>
              </div>

              {/* Trading Tools */}
              <div className="lg:col-span-1">
                <TradingTools
                  symbol={symbol}
                  price={quote?.data?.price ?? null}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
