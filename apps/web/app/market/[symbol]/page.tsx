"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type {
  StockHistoricalData,
  StockQuote,
} from "../../../lib/types/market";
import StockDetails from "@/components/StockDetails";
import { marketService } from "@/services";

export default function SymbolPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = Array.isArray(params.symbol)
    ? params.symbol[0]
    : params.symbol;

  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuoteData = async () => {
      if (!symbol) {
        setError("No symbol provided");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const quoteData = await marketService.getQuote(symbol.toUpperCase());

        if (quoteData && quoteData.data) {
          setQuote(quoteData);
        } else {
          setError(`No data found for symbol: ${symbol}`);
        }
      } catch (err: any) {
        console.error("Failed to fetch quote data:", err);
        setError(err?.message || `Failed to load data for ${symbol}`);
      } finally {
        setLoading(false);
      }
    };

    fetchQuoteData();
  }, [symbol]);

  // Update document title when symbol changes
  useEffect(() => {
    if (symbol && quote?.data?.name) {
      document.title = `${quote.data.name} (${symbol.toUpperCase()}) - BullReckon`;
    } else if (symbol) {
      document.title = `${symbol.toUpperCase()} - BullReckon`;
    }

    return () => {
      document.title = "BullReckon - Trading Platform";
    };
  }, [symbol, quote]);

  const handleBack = () => {
    router.push("/market");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">
            Loading {symbol?.toUpperCase()} data...
          </p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-destructive">
            Unable to Load Symbol
          </h1>
          <p className="text-muted-foreground">{error}</p>
          <div className="space-y-2">
            <button
              onClick={handleBack}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              ← Back to Market
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StockDetails
      symbol={symbol.toUpperCase()}
      quote={quote}
      onBack={handleBack}
    />
  );
}
