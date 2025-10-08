"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Copy,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Play,
  Pause,
  Settings,
  Code,
  Brain,
  Blocks,
  DollarSign,
  Clock,
  Activity,
} from "lucide-react";
import {
  apiKeyService,
  ApiKeyData,
  GeneratedApiKey,
} from "@/services/apiKeyService";
import { strategyService, Strategy } from "@/services/strategyService";
import {
  scriptTradeService,
  ScriptWithTrades,
} from "@/services/scriptTradeService";

interface ScriptInfo {
  _id: string;
  scriptName: string;
  trades: Array<{
    tradeId: string;
    confidence?: number;
    reason?: string;
    trade?: {
      _id: string;
      symbol: string;
      action: string;
      quantity: number;
      triggerPrice: number;
      status: string;
      executedAt?: string;
      fees: number;
      total: number;
      source: string;
      realizedPnL?: number;
    };
  }>;
}

const StrategyPage = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [strategiesLoading, setStrategiesLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [generatedKey, setGeneratedKey] = useState<GeneratedApiKey | null>(
    null
  );
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [scripts, setScripts] = useState<ScriptInfo[]>([]);
  const [loadingScripts, setLoadingScripts] = useState(true);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const router = useRouter();
  const { toast } = useToast();

  // Fetch API keys on mount
  useEffect(() => {
    fetchApiKeys();
    fetchStrategies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch strategies when status filter changes
  useEffect(() => {
    fetchStrategies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus]);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const keys = await apiKeyService.getUserApiKeys();
      setApiKeys(keys);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to fetch API keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStrategies = async () => {
    try {
      setStrategiesLoading(true);
      const params = selectedStatus === "all" ? {} : { status: selectedStatus };
      const result = await strategyService.getStrategies(params);
      setStrategies(result.strategies);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to fetch strategies",
        variant: "destructive",
      });
    } finally {
      setStrategiesLoading(false);
    }
  };

  useEffect(() => {
    // Fetch scripts from backend
    const fetchScripts = async () => {
      setLoadingScripts(true);
      try {
        const response = await scriptTradeService.getAllScriptTrades();
        const mappedScripts = response.scripts.map((script) => ({
          _id: script._id,
          scriptName: script.scriptName,
          trades: script.trades,
        }));
        setScripts(mappedScripts);
      } catch (error) {
        console.error("Failed to fetch script trades", error);
        setScripts([]);
      } finally {
        setLoadingScripts(false);
      }
    };
    fetchScripts();
  }, []);

  const handleGenerateApiKey = async () => {
    try {
      setGenerating(true);
      const newKey = await apiKeyService.generateApiKey(expiresInDays);
      // Strip PEM headers/footers and trim whitespace from the public key
      if (newKey.publicKey) {
        newKey.publicKey = newKey.publicKey
          .replace(/-----BEGIN PUBLIC KEY-----/g, "")
          .replace(/-----END PUBLIC KEY-----/g, "")
          .trim();
      }
      setGeneratedKey(newKey);
      setShowKeyDialog(true);

      toast({
        title: "API Key Generated",
        description:
          "Your new API key has been generated successfully. Please save it securely.",
      });

      // Refresh the list
      await fetchApiKeys();
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to generate API key",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (
      !confirm(
        "Are you sure you want to revoke this API key? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await apiKeyService.revokeApiKey(keyId);

      toast({
        title: "API Key Revoked",
        description: "The API key has been revoked successfully.",
      });

      // Refresh the list
      await fetchApiKeys();
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to revoke API key",
        variant: "destructive",
      });
    }
  };

  const handleCopyKey = async (key: string) => {
    try {
      await apiKeyService.copyToClipboard(key);
      toast({
        title: "Copied",
        description: "API key copied to clipboard",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const handleStrategyStatusChange = async (
    strategyId: string,
    newStatus: "active" | "inactive" | "paused"
  ) => {
    try {
      await strategyService.updateStrategyStatus(strategyId, newStatus);

      toast({
        title: "Strategy Updated",
        description: `Strategy ${newStatus === "active" ? "activated" : newStatus === "inactive" ? "deactivated" : "paused"} successfully.`,
      });

      // Refresh strategies
      await fetchStrategies();
    } catch (error) {
      toast({
        title: "Error",
        description:
          (error as Error).message || "Failed to update strategy status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStrategy = async (strategyId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this strategy? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await strategyService.deleteStrategy(strategyId);

      toast({
        title: "Strategy Deleted",
        description: "Strategy deleted successfully.",
      });

      // Refresh strategies
      await fetchStrategies();
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to delete strategy",
        variant: "destructive",
      });
    }
  };

  const maskKey = (key: string) => {
    if (key.length < 20) return key;
    return `${key.substring(0, 10)}...${key.substring(key.length - 10)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "paused":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "error":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    }
  };

  const getStrategyIcon = (type: string) => {
    switch (type) {
      case "no-code":
        return <Blocks className="h-4 w-4" />;
      case "code":
        return <Code className="h-4 w-4" />;
      case "ml":
        return <Brain className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <div className="lg:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl font-extrabold tracking-tight">
                    Strategy Management
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Manage your trading strategies, API keys, and execution
                    logs.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/no-code-builder">
                  <Button className="shadow">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Strategy
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Documentation reference */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-sm">Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                For detailed guides and API examples for strategy development,
                see the API docs.
              </p>
              <Link
                href="/docs/api#algo-trading"
                className="text-primary hover:underline"
              >
                Open API Docs — Algorithmic Trading →
              </Link>
            </CardContent>
          </Card>
          {/* Trading Strategies Section */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Trading Strategies</CardTitle>
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedStatus}
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={fetchStrategies} variant="outline" size="sm">
                    <Loader2
                      className={`h-4 w-4 mr-2 ${strategiesLoading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {strategiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : strategies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Blocks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">
                    No strategies found
                  </p>
                  <p className="text-sm mb-4">
                    {selectedStatus === "all"
                      ? "Create your first trading strategy to get started."
                      : `No strategies with status "${selectedStatus}" found.`}
                  </p>
                  <Link href="/no-code-builder">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Strategy
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {strategies.map((strategy) => (
                    <div
                      key={strategy._id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border hover:shadow-md transition-all"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStrategyIcon(strategy.type)}
                          <h3 className="font-semibold text-lg">
                            {strategy.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={getStatusColor(strategy.status)}
                          >
                            {strategy.status}
                          </Badge>
                          <Badge variant="outline">
                            {strategy.type === "no-code"
                              ? "No-Code"
                              : strategy.type.toUpperCase()}
                          </Badge>
                        </div>

                        {strategy.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {strategy.description}
                          </p>
                        )}

                        <div className="flex items-center gap-6 text-xs text-muted-foreground">
                          <span>Rules: {strategy.rules?.length || 0}</span>
                          <span>
                            Trades: {strategy.metrics?.totalTrades || 0}
                          </span>
                          <span>
                            Win Rate:{" "}
                            {(strategy.metrics?.winRate || 0).toFixed(1)}%
                          </span>
                          <span>
                            P&L: $
                            {(
                              strategy.currentPerformance?.netProfit ||
                              strategy.metrics?.totalProfit ||
                              0
                            ).toFixed(2)}
                          </span>
                          <span>
                            Updated:{" "}
                            {strategy.updatedAt
                              ? new Date(
                                  strategy.updatedAt
                                ).toLocaleDateString()
                              : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Strategy Status Controls */}
                        {strategy.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStrategyStatusChange(strategy._id, "paused")
                            }
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStrategyStatusChange(strategy._id, "active")
                            }
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Strategy Details */}
                        <Link href={`/strategy/${strategy._id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-primary/10"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </Link>

                        {/* Delete Strategy */}
                        {strategy.status === "inactive" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStrategy(strategy._id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active API Keys Section */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Active API Keys</CardTitle>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                    className="w-24"
                    placeholder="Days"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                  <Button
                    onClick={handleGenerateApiKey}
                    disabled={generating || loading}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Generate New Key
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>
                    No API keys yet. Generate your first key to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((apiKey) => (
                    <div
                      key={apiKey.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="font-mono text-sm">
                            {visibleKeys.has(apiKey.id)
                              ? apiKey.id
                              : maskKey(apiKey.id)}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                          >
                            {visibleKeys.has(apiKey.id) ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Created:{" "}
                            {new Date(apiKey.createdAt).toLocaleString()}
                          </span>
                          {apiKey.expiresAt && (
                            <span>
                              Expires:{" "}
                              {new Date(apiKey.expiresAt).toLocaleString()}
                            </span>
                          )}
                          <span>Requests: {apiKey.requestsUsed}</span>
                          <span>
                            Rate Limit: {apiKey.rateLimit.maxPerMinute}/min
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={getStatusColor(
                            apiKey.isActive ? "active" : "inactive"
                          )}
                        >
                          {apiKey.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyKey(apiKey.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevokeApiKey(apiKey.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Scripts Section */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-xl">Active Scripts</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loadingScripts ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading scripts...
                </div>
              ) : scripts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No scripts found.
                </div>
              ) : (
                <div className="space-y-4">
                  {scripts.map((script) => {
                    const isExpanded = expandedScript === script._id;
                    const totalPnL = script.trades.reduce((sum, tradeInfo) => {
                      return sum + (tradeInfo.trade?.realizedPnL || 0);
                    }, 0);
                    const executedTrades = script.trades.filter(
                      (t) => t.trade?.status === "executed"
                    );
                    const pendingTrades = script.trades.filter(
                      (t) => t.trade?.status === "pending"
                    );

                    return (
                      <div key={script._id} className="border rounded-lg">
                        <div
                          className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:shadow-md cursor-pointer transition-all"
                          onClick={() =>
                            setExpandedScript(isExpanded ? null : script._id)
                          }
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg">
                                {script.scriptName}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {script.trades.length} total trades
                              </Badge>
                              {executedTrades.length > 0 && (
                                <Badge
                                  variant={
                                    totalPnL >= 0 ? "default" : "destructive"
                                  }
                                  className="text-xs"
                                >
                                  ${totalPnL.toFixed(2)} P&L
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Activity className="h-4 w-4" />
                                {executedTrades.length} executed
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {pendingTrades.length} pending
                              </span>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        {isExpanded && (
                          <div className="border-t bg-background">
                            <div className="p-4 space-y-3">
                              {script.trades.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No trades recorded for this script
                                </p>
                              ) : (
                                script.trades.map((tradeInfo, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-muted/30 rounded border"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge
                                          variant={
                                            tradeInfo.trade?.action === "BUY"
                                              ? "default"
                                              : "secondary"
                                          }
                                          className="text-xs"
                                        >
                                          {tradeInfo.trade?.action || "Unknown"}
                                        </Badge>
                                        <span className="font-medium">
                                          {tradeInfo.trade?.symbol ||
                                            "Unknown Symbol"}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                          {tradeInfo.trade?.quantity} shares
                                        </span>
                                        <Badge
                                          variant={
                                            tradeInfo.trade?.status ===
                                            "executed"
                                              ? "default"
                                              : "outline"
                                          }
                                          className="text-xs"
                                        >
                                          {tradeInfo.trade?.status || "unknown"}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <DollarSign className="h-3 w-3" />$
                                          {tradeInfo.trade?.triggerPrice?.toFixed(
                                            2
                                          ) || "0.00"}
                                        </span>
                                        {tradeInfo.trade?.executedAt && (
                                          <span>
                                            {new Date(
                                              tradeInfo.trade.executedAt
                                            ).toLocaleDateString()}
                                          </span>
                                        )}
                                        {tradeInfo.confidence && (
                                          <span>
                                            Confidence:{" "}
                                            {(
                                              tradeInfo.confidence * 100
                                            ).toFixed(0)}
                                            %
                                          </span>
                                        )}
                                      </div>
                                      {tradeInfo.reason && (
                                        <p className="text-xs text-muted-foreground mt-1 italic">
                                          "{tradeInfo.reason}"
                                        </p>
                                      )}
                                    </div>
                                    {tradeInfo.trade?.realizedPnL !==
                                      undefined &&
                                      tradeInfo.trade.realizedPnL !== 0 && (
                                        <div
                                          className={`text-right ${tradeInfo.trade.realizedPnL >= 0 ? "text-green-600" : "text-red-600"}`}
                                        >
                                          <div className="font-medium text-sm">
                                            {tradeInfo.trade.realizedPnL >= 0
                                              ? "+"
                                              : ""}
                                            $
                                            {tradeInfo.trade.realizedPnL.toFixed(
                                              2
                                            )}
                                          </div>
                                          <div className="text-xs">P&L</div>
                                        </div>
                                      )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Documentation Section */}
          <Card className="border-2">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-xl">API Documentation</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Your strategy endpoint should return JSON in the following
                  format:
                </p>

                <div className="bg-slate-950 p-6 rounded-lg border">
                  <pre className="text-sm text-slate-50 font-mono overflow-x-auto">
                    {`{
  "action": "BUY" | "SELL" | "HOLD",
  "symbol": "BTCUSDT",
  "quantity": 0.5,
  "confidence": 85,
  "reason": "Golden cross detected"
}`}
                  </pre>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      Required Fields
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          action
                        </code>
                        <span>BUY, SELL, or HOLD</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          symbol
                        </code>
                        <span>Trading pair (e.g., BTCUSDT)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          quantity
                        </code>
                        <span>Amount to trade</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                      Optional Fields
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          confidence
                        </code>
                        <span>Signal strength (0-100)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          reason
                        </code>
                        <span>Human-readable explanation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono mt-0.5">
                          price
                        </code>
                        <span>Suggested execution price</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Generated Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>API Key Generated Successfully</DialogTitle>
            <DialogDescription>
              Save this public key securely. You won&apos;t be able to see it
              again.
            </DialogDescription>
          </DialogHeader>
          {generatedKey && (
            <div className="space-y-4">
              <div>
                <Label>Public Key</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg border">
                  <code className="text-xs font-mono break-all">
                    {generatedKey.publicKey}
                  </code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleCopyKey(generatedKey.publicKey)}
                >
                  <Copy className="h-3 w-3 mr-2" />
                  Copy Key
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p>{new Date(generatedKey.createdAt).toLocaleString()}</p>
                </div>
                {generatedKey.expiresAt && (
                  <div>
                    <Label className="text-muted-foreground">Expires</Label>
                    <p>{new Date(generatedKey.expiresAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-600 dark:text-yellow-500">
                  ⚠️ {generatedKey.warning}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowKeyDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StrategyPage;
