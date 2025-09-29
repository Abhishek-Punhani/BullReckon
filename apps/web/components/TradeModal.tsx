"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { marketService, calcService, authService } from "@/lib/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Props = {
  symbol: string;
};

export default function TradeModal({ symbol }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [qty, setQty] = useState<string>("1");
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    marketService
      .getCachedQuote(symbol)
      .then((q) => {
        if (!mounted) return;
        const p = q && q.price ? q.price : q.regularMarketPrice || null;
        setPrice(p ?? null);
      })
      .catch(() => {
        setPrice(null);
      });
    return () => {
      mounted = false;
    };
  }, [open, symbol]);

  const handlePlace = async () => {
    const quantity = parseFloat(qty);
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Enter a quantity greater than 0",
      });
      return;
    }
    if (!price) {
      toast({
        title: "Price unavailable",
        description: "Cannot get current market price",
      });
      return;
    }

    setLoading(true);
    try {
      const token = authService.getToken();
      const trade = {
        symbol,
        side,
        quantity,
        price,
        type: "MARKET",
        executedAt: new Date().toISOString(),
      };

      // Try to call calcService.executeTrade if backend supports it
      if (token) {
        await calcService.executeTrade(trade, token);
      } else {
        // Fallback: store in localStorage ledger
        const key = "mock_trades";
        const existing =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem(key) || "[]")
            : [];
        existing.push(trade);
        localStorage.setItem(key, JSON.stringify(existing));
      }

      toast({
        title: "Trade executed",
        description: `${side} ${quantity} ${symbol} @ ${price}`,
      });
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "Trade failed",
        description: err?.message ?? String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Buy/Sell</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Place Order — {symbol}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button
              variant={side === "BUY" ? "default" : "outline"}
              onClick={() => setSide("BUY")}
            >
              Buy
            </Button>
            <Button
              variant={side === "SELL" ? "default" : "outline"}
              onClick={() => setSide("SELL")}
            >
              Sell
            </Button>
          </div>

          <div>
            <Label>Quantity</Label>
            <Input value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>

          <div>
            <Label>Estimated Price</Label>
            <div className="text-lg font-medium">
              {price ? `$${price.toFixed(2)}` : "—"}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handlePlace} disabled={loading}>
            {loading ? "Placing..." : "Place Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
