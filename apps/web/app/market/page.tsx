"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StockHistoricalData, StockQuote } from "../../lib/types/market";
import SymbolSearch from "../../components/SymbolSearch";
import Navigation from "@/components/Navigation";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { marketService } from "@/services";
import NewsFeed from "@/components/NewsFeed";

// Define market categories locally
const MARKET_CATEGORIES = {
  stocks: [
    { value: "AAPL", label: "Apple Inc." },
    { value: "MSFT", label: "Microsoft" },
    { value: "GOOGL", label: "Google" },
    { value: "TSLA", label: "Tesla Inc." },
    { value: "AMZN", label: "Amazon" },
    { value: "META", label: "Meta" },
  ],
  crypto: [
    { value: "BTC-USD", label: "Bitcoin" },
    { value: "ETH-USD", label: "Ethereum" },
    { value: "ADA-USD", label: "Cardano" },
    { value: "DOT-USD", label: "Polkadot" },
  ],
  indices: [
    { value: "^GSPC", label: "S&P 500", icon: "📈" },
    { value: "^DJI", label: "Dow Jones", icon: "📊" },
    { value: "^IXIC", label: "NASDAQ", icon: "💻" },
    { value: "^RUT", label: "Russell 2000", icon: "📉" },
  ],
  commodities: [
    { value: "GC=F", label: "Gold" },
    { value: "SI=F", label: "Silver" },
    { value: "CL=F", label: "Oil" },
    { value: "NG=F", label: "Natural Gas" },
  ],
};

type Category = keyof typeof MARKET_CATEGORIES;

export default function MarketPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
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

  const handleSymbolSelect = (selectedSymbol: string) => {
    router.push(`/market/${selectedSymbol.toUpperCase()}`);
  };

  const handleAssetClick = (assetSymbol: string) => {
    router.push(`/market/${assetSymbol.toUpperCase()}`);
  };

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
              <SymbolSearch onSelect={handleSymbolSelect} />
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
            {/* Bottom Section: Stock List and Trading Tools */}
            <div className="w-full">
              {/* Asset List */}
              <div>
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
                              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                              onClick={() => handleAssetClick(asset.symbol)}
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
                <div className="mt-10 text-3xl">Market News & Analysis</div>
                <div className="mt-10">
                  <NewsFeed />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
