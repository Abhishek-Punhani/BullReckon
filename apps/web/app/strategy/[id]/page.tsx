"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ChevronLeft, Calendar } from "lucide-react";
import api from "@/lib/api";

interface Trade {
  _id: string;
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  triggerPrice: number;
  fees: number;
  total: number;
  source: string;
  limitPrice?: number;
  stopPrice?: number;
  status: string;
  realizedPnL?: number;
  executedAt?: string;
  createdAt?: string;
  unrealizedPnL?: number;
}

interface PopulatedTradeMeta {
  tradeId: string;
  confidence?: number;
  reason?: string;
  trade: Trade | null;
}

interface ScriptTrade {
  _id: string;
  scriptName: string;
  trades: PopulatedTradeMeta[];
}

const ScriptTradesPage = () => {
  const params = useParams();
  const router = useRouter();
  const scriptId = params?.id as string;
  const [script, setScript] = useState<ScriptTrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScriptTrades = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/api/script-trades/${scriptId}`);
        setScript(res.data.scriptTrade);
      } catch {
        setError("Failed to fetch script trades");
      } finally {
        setLoading(false);
      }
    };
    if (scriptId) fetchScriptTrades();
  }, [scriptId]);

  // Analysis
  const totalTrades = script?.trades.length || 0;
  const totalVolume =
    script?.trades.reduce((sum, t) => sum + (t.trade?.total || 0), 0) || 0;
  const totalProfit =
    script?.trades.reduce((sum, t) => sum + (t.trade?.realizedPnL || 0), 0) ||
    0;
  const winRate =
    script && script.trades.length > 0
      ? (script.trades.filter((t) => (t.trade?.realizedPnL || 0) > 0).length /
          script.trades.length) *
        100
      : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="lg:pl-64">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              className="rounded-lg p-2 bg-muted hover:bg-muted/70"
              onClick={() => router.push("/strategy")}
            >
              {" "}
              <ChevronLeft className="h-5 w-5" />{" "}
            </button>
            <h1 className="text-3xl font-bold tracking-tight">
              Script: {script?.scriptName || scriptId}
            </h1>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Trades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalTrades}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Total Volume</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${totalVolume.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Total Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {totalProfit.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Win Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {winRate.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" /> Trade History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="text-left p-4 font-semibold text-muted-foreground">
                            Trade ID
                          </th>
                          <th className="text-right p-4 font-semibold text-muted-foreground">
                            Confidence
                          </th>
                          <th className="text-left p-4 font-semibold text-muted-foreground">
                            Reason
                          </th>
                          <th className="text-left p-4 font-semibold text-muted-foreground">
                            Symbol
                          </th>
                          <th className="text-left p-4 font-semibold text-muted-foreground">
                            Action
                          </th>
                          <th className="text-right p-4 font-semibold text-muted-foreground">
                            Quantity
                          </th>
                          <th className="text-right p-4 font-semibold text-muted-foreground">
                            Trigger Price
                          </th>
                          <th className="text-right p-4 font-semibold text-muted-foreground">
                            Fees
                          </th>
                          <th className="text-right p-4 font-semibold text-muted-foreground">
                            Total
                          </th>
                          <th className="text-right p-4 font-semibold text-muted-foreground">
                            Realized PnL
                          </th>
                          <th className="text-center p-4 font-semibold text-muted-foreground">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {script?.trades.map((trade) => (
                          <tr key={trade.tradeId}>
                            <td className="p-4 text-sm">{trade.tradeId}</td>
                            <td className="p-4 text-right font-mono">
                              {trade.confidence ?? "-"}
                            </td>
                            <td className="p-4 text-left font-mono">
                              {trade.reason || "-"}
                            </td>
                            <td className="p-4">
                              {trade.trade?.symbol || "-"}
                            </td>
                            <td className="p-4">
                              {trade.trade?.action || "-"}
                            </td>
                            <td className="p-4 text-right font-mono">
                              {trade.trade?.quantity ?? "-"}
                            </td>
                            <td className="p-4 text-right font-mono">
                              {trade.trade?.triggerPrice ?? "-"}
                            </td>
                            <td className="p-4 text-right font-mono">
                              {trade.trade?.fees ?? "-"}
                            </td>
                            <td className="p-4 text-right font-mono">
                              {trade.trade?.total ?? "-"}
                            </td>
                            <td className="p-4 text-right font-mono">
                              {trade.trade?.realizedPnL ?? "-"}
                            </td>
                            <td className="p-4 text-center">
                              {trade.trade?.status || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {script?.trades.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No trades for this script yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ScriptTradesPage;
