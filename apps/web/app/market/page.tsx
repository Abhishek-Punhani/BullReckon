"use client";
import React, { useEffect, useState } from "react";
import MarketChart from "../../components/MarketCharts";
import { marketService } from "../../lib/services";
import type { StockHistoricalData } from "../../lib/types/market";
import SymbolSearch from "../../components/SymbolSearch";
import Navigation from "@/components/Navigation";
import TradeModal from "@/components/TradeModal";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardContent } from "../../components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

const PERIODS = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "ytd", label: "YTD" },
  { value: "5y", label: "5Y" },
  { value: "max", label: "Max" },
];

export default function MarketPage() {
  // start with a sensible default symbol; user can change via the search
  const [symbol, setSymbol] = useState<string>("AAPL");
  const [period, setPeriod] = useState<string>("1y");
  const [historical, setHistorical] = useState<StockHistoricalData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await marketService.getHistoricalData(
          symbol,
          period,
          "1d"
        );
        if (cancelled) return;
        setHistorical(data);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Failed to load historical data");
        setHistorical(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [symbol, period]);

  // Poll latest quote every 5s
  useEffect(() => {
    let mounted = true;
    let timer: NodeJS.Timeout | null = null;

    const fetchQuote = async () => {
      try {
        const q = await marketService.getQuote(symbol);
        if (!mounted) return;
        const price = q?.currentPrice ?? q?.close ?? null;
        setLivePrice(price);
      } catch (err) {
        // ignore
      } finally {
        timer = setTimeout(fetchQuote, 5000);
      }
    };

    fetchQuote();
    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [symbol]);

  const isPositive = (livePrice ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="lg:pl-64">
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Market</h2>

          <Card className="mb-4">
            <CardHeader className="flex items-center gap-4">
              <div className="w-60">
                <SymbolSearch onSelect={(sym) => setSymbol(sym)} />
              </div>

              <div className="flex items-center gap-2">
                {PERIODS.map((p) => (
                  <Button
                    key={p.value}
                    size="sm"
                    variant={period === p.value ? "default" : "ghost"}
                    onClick={() => setPeriod(p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>

              <div className="ml-auto flex items-center gap-3">
                <div className="text-sm text-muted-foreground">Live</div>
                <div className="flex items-center gap-2">
                  {livePrice != null ? (
                    <div className="flex items-center gap-2">
                      {isPositive ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <div className="text-lg font-medium">
                        ${livePrice.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">--</div>
                  )}
                </div>
                <div>
                  <TradeModal symbol={symbol} />
                </div>
              </div>
            </CardHeader>
          </Card>

          {loading && <div className="mb-4">Loading historical data...</div>}
          {error && <div className="mb-4 text-destructive">{error}</div>}

          <Card>
            <CardContent className="p-0">
              <div className="w-full border-border rounded-md overflow-hidden">
                <MarketChart historical={historical} height={420} />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
