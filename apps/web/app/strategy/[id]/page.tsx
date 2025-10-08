"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Activity,
  DollarSign,
  Target,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  scriptTradeService,
  ScriptWithTrades,
} from "@/services/scriptTradeService";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const ScriptDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const scriptName = params?.id as string;

  const [script, setScript] = useState<ScriptWithTrades | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchScript = useCallback(async () => {
    try {
      setLoading(true);
      const data = await scriptTradeService.getScriptTradesByName(scriptName);
      setScript(data.scriptTrade);
    } catch (error) {
      toast({
        title: "Script Not Found",
        description:
          (error as Error).message || "Unable to load script details",
        variant: "destructive",
      });
      router.push("/strategy");
    } finally {
      setLoading(false);
    }
  }, [scriptName, router, toast]);

  // Load script data
  useEffect(() => {
    if (scriptName) {
      fetchScript();
    }
  }, [scriptName, fetchScript]);

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  // Calculate metrics
  const calculateMetrics = (trades: ScriptWithTrades["trades"]) => {
    const executedTrades = trades.filter((t) => t.trade?.status === "executed");
    const totalTrades = executedTrades.length;
    const winningTrades = executedTrades.filter(
      (t) => (t.trade?.realizedPnL ?? 0) > 0
    ).length;
    const losingTrades = executedTrades.filter(
      (t) => (t.trade?.realizedPnL ?? 0) < 0
    ).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalPnL = executedTrades.reduce(
      (sum, t) => sum + (t.trade?.realizedPnL ?? 0),
      0
    );
    const grossProfit = executedTrades
      .filter((t) => (t.trade?.realizedPnL ?? 0) > 0)
      .reduce((sum, t) => sum + (t.trade?.realizedPnL ?? 0), 0);
    const grossLoss = executedTrades
      .filter((t) => (t.trade?.realizedPnL ?? 0) < 0)
      .reduce((sum, t) => sum + (t.trade?.realizedPnL ?? 0), 0);
    const profitFactor =
      grossLoss !== 0 ? grossProfit / Math.abs(grossLoss) : 0;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalPnL,
      grossProfit,
      grossLoss,
      profitFactor,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="lg:ml-64 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading script...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="lg:ml-64 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Script Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The script you&apos;re looking for doesn&apos;t exist or has been
              deleted.
            </p>
            <Button onClick={() => router.push("/strategy")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Scripts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const metrics = calculateMetrics(script.trades);
  const executedTrades = script.trades.filter(
    (t) => t.trade?.status === "executed"
  );

  // Prepare chart data
  const pnlData = executedTrades.map((t, index) => ({
    trade: index + 1,
    pnl: t.trade?.realizedPnL || 0,
  }));

  const cumulativePnL = executedTrades.reduce(
    (acc, t, index) => {
      const prev = acc[index - 1]?.cumulative || 0;
      acc.push({
        trade: index + 1,
        cumulative: prev + (t.trade?.realizedPnL || 0),
      });
      return acc;
    },
    [] as { trade: number; cumulative: number }[]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/40 to-background/80">
      <Navigation />
      <div className="lg:ml-64 container max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/strategy")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-2">
                <BarChart3 className="h-7 w-7 text-primary" />
                {script.scriptName}
              </h1>
              <p className="text-base text-muted-foreground mt-2">
                Script trading performance and analysis
              </p>
            </div>
          </div>
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            ACTIVE
          </Badge>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Net P&L
                  </p>
                  <p
                    className={`text-2xl font-bold ${metrics.totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCurrency(metrics.totalPnL)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Win Rate
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatPercent(metrics.winRate)}
                  </p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Trades
                  </p>
                  <p className="text-2xl font-bold">{metrics.totalTrades}</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Profit Factor
                  </p>
                  <p className="text-2xl font-bold">
                    {metrics.profitFactor.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="trades">Trade Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Script Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Script Name:
                      </span>
                      <p>{script.scriptName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Total Trades:
                      </span>
                      <p>{script.trades.length}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Executed Trades:
                      </span>
                      <p>{executedTrades.length}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Pending Trades:
                      </span>
                      <p>
                        {
                          script.trades.filter(
                            (t) => t.trade?.status === "pending"
                          ).length
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Winning Trades:
                      </span>
                      <p className="text-green-600">{metrics.winningTrades}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Losing Trades:
                      </span>
                      <p className="text-red-600">{metrics.losingTrades}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Gross Profit:
                      </span>
                      <p className="text-green-600">
                        {formatCurrency(metrics.grossProfit)}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Gross Loss:
                      </span>
                      <p className="text-red-600">
                        {formatCurrency(metrics.grossLoss)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cumulative P&L</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={cumulativePnL}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="trade" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [
                          formatCurrency(value as number),
                          "Cumulative P&L",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="cumulative"
                        stroke="#8884d8"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trade P&L Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={pnlData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="trade" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [
                          formatCurrency(value as number),
                          "P&L",
                        ]}
                      />
                      <Bar dataKey="pnl" fill="#8884d8">
                        {pnlData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trades" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trade Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Symbol</th>
                        <th className="text-left p-3 font-semibold">Action</th>
                        <th className="text-right p-3 font-semibold">
                          Quantity
                        </th>
                        <th className="text-right p-3 font-semibold">Price</th>
                        <th className="text-right p-3 font-semibold">Fees</th>
                        <th className="text-right p-3 font-semibold">Total</th>
                        <th className="text-right p-3 font-semibold">P&L</th>
                        <th className="text-left p-3 font-semibold">Status</th>
                        <th className="text-left p-3 font-semibold">
                          Executed At
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {script.trades.map((tradeInfo, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            {tradeInfo.trade?.symbol || "N/A"}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                tradeInfo.trade?.action === "BUY"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {tradeInfo.trade?.action || "N/A"}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            {tradeInfo.trade?.quantity || "N/A"}
                          </td>
                          <td className="p-3 text-right">
                            {tradeInfo.trade?.triggerPrice
                              ? formatCurrency(tradeInfo.trade.triggerPrice)
                              : "N/A"}
                          </td>
                          <td className="p-3 text-right">
                            {tradeInfo.trade?.fees
                              ? formatCurrency(tradeInfo.trade.fees)
                              : "N/A"}
                          </td>
                          <td className="p-3 text-right">
                            {tradeInfo.trade?.total
                              ? formatCurrency(tradeInfo.trade.total)
                              : "N/A"}
                          </td>
                          <td
                            className="p-3 text-right"
                            style={{
                              color:
                                (tradeInfo.trade?.realizedPnL || 0) >= 0
                                  ? "green"
                                  : "red",
                            }}
                          >
                            {tradeInfo.trade?.realizedPnL
                              ? formatCurrency(tradeInfo.trade.realizedPnL)
                              : "N/A"}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                tradeInfo.trade?.status === "executed"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {tradeInfo.trade?.status || "N/A"}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {tradeInfo.trade?.executedAt
                              ? new Date(
                                  tradeInfo.trade.executedAt
                                ).toLocaleString()
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ScriptDetailPage;
