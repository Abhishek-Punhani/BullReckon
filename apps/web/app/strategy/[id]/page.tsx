"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  Play,
  Pause,
  BarChart3,
  Settings,
  History,
  Edit,
  Trash2,
  Plus,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Target,
  Shield,
  Clock,
  Zap,
  RefreshCw,
} from "lucide-react";
import {
  strategyService,
  type Strategy,
  type StrategyRule,
  type StrategyConfig,
  type ExecutionLog,
} from "@/services/strategyService";

const StrategyDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const strategyId = params?.id as string;

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    rules: [] as StrategyRule[],
    config: {} as StrategyConfig,
  });

  // Queue management state
  const [queueDialog, setQueueDialog] = useState(false);
  const [queueAction, setQueueAction] = useState<"pause" | "resume" | null>(
    null
  );

  // Load strategy data
  useEffect(() => {
    if (strategyId) {
      fetchStrategy();
      fetchExecutionLogs();
    }
  }, [strategyId]);

  const fetchStrategy = async () => {
    try {
      setLoading(true);
      const data = await strategyService.getStrategy(strategyId);
      setStrategy(data);

      // Initialize edit form
      setEditForm({
        name: data.name,
        description: data.description || "",
        rules: data.rules,
        config: data.config,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
      router.push("/strategy");
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutionLogs = async () => {
    try {
      setLogsLoading(true);
      const result = await strategyService.getExecutionLogs(strategyId, {
        limit: 50,
      });
      setExecutionLogs(result.logs);
    } catch (error) {
      console.error("Failed to fetch execution logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!strategy) return;

    // Validate the form
    const configValidation = strategyService.validateConfig(editForm.config);
    if (!configValidation.valid) {
      toast({
        title: "Invalid Configuration",
        description: configValidation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    // Validate rules
    for (const rule of editForm.rules) {
      const ruleValidation = strategyService.validateRule(rule);
      if (!ruleValidation.valid) {
        toast({
          title: `Invalid Rule: ${rule.name || rule.id}`,
          description: ruleValidation.errors.join(", "),
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setSaving(true);

      // If strategy is active, we need to pause it first
      if (strategy.status === "active") {
        setQueueAction("pause");
        setQueueDialog(true);
        return;
      }

      // Update the strategy
      const updatedStrategy = await strategyService.updateStrategy(
        strategyId,
        editForm
      );
      setStrategy(updatedStrategy);
      setIsEditing(false);

      toast({
        title: "Strategy Updated",
        description: "Strategy has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQueueAction = async () => {
    if (!strategy || !queueAction) return;

    try {
      setSaving(true);

      if (queueAction === "pause") {
        // Pause the strategy first
        await strategyService.updateStrategyStatus(strategyId, "paused");

        // Update the strategy with new data
        await strategyService.updateStrategy(strategyId, editForm);

        // Resume the strategy
        await strategyService.updateStrategyStatus(strategyId, "active");

        toast({
          title: "Strategy Updated",
          description: "Strategy has been updated and resumed in the queue.",
        });
      } else if (queueAction === "resume") {
        await strategyService.updateStrategyStatus(strategyId, "active");

        toast({
          title: "Strategy Resumed",
          description: "Strategy has been resumed in the execution queue.",
        });
      }

      // Refresh strategy data
      await fetchStrategy();
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Queue Action Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setQueueDialog(false);
      setQueueAction(null);
    }
  };

  const handleStatusChange = async (
    newStatus: "active" | "inactive" | "paused"
  ) => {
    if (!strategy) return;

    try {
      await strategyService.updateStrategyStatus(strategyId, newStatus);
      await fetchStrategy();

      const statusText =
        newStatus === "active"
          ? "activated"
          : newStatus === "paused"
            ? "paused"
            : "deactivated";

      toast({
        title: "Status Updated",
        description: `Strategy has been ${statusText}.`,
      });
    } catch (error) {
      toast({
        title: "Status Update Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleExecuteStrategy = async () => {
    if (!strategy) return;

    try {
      setExecuting(true);

      // Use the first rule's symbol or default to BTCUSDT
      const symbol = strategy.rules[0]?.condition?.symbol || "BTCUSDT";

      await strategyService.executeStrategy(strategyId, symbol, true);

      toast({
        title: "Strategy Execution Queued",
        description:
          "Strategy has been queued for execution. Check logs for results.",
      });

      // Refresh logs after a short delay
      setTimeout(() => {
        fetchExecutionLogs();
      }, 2000);
    } catch (error) {
      toast({
        title: "Execution Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  const addNewRule = () => {
    const newRule: StrategyRule = {
      id: `rule_${Date.now()}`,
      name: `Rule ${editForm.rules.length + 1}`,
      condition: {
        indicator: "price",
        operator: "greater_than",
        value: 100,
        symbol: "BTCUSDT",
        timeframe: "1h",
      },
      action: {
        type: "BUY",
        quantity: 10,
        quantityType: "percentage",
        priceType: "market",
      },
      isActive: true,
      priority: editForm.rules.length + 1,
      cooldownMinutes: 60,
    };

    setEditForm((prev) => ({
      ...prev,
      rules: [...prev.rules, newRule],
    }));
  };

  const updateRule = (index: number, updatedRule: StrategyRule) => {
    setEditForm((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, i) => (i === index ? updatedRule : rule)),
    }));
  };

  const removeRule = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
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

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case "executed":
        return "bg-emerald-500/10 text-emerald-500";
      case "pending":
        return "bg-blue-500/10 text-blue-500";
      case "failed":
        return "bg-red-500/10 text-red-500";
      case "cancelled":
        return "bg-gray-500/10 text-gray-500";
      default:
        return "bg-slate-500/10 text-slate-500";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="lg:ml-64 flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="lg:ml-64 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Strategy Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested strategy could not be found.
            </p>
            <Link href="/strategy">
              <Button>Back to Strategies</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="lg:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href="/strategy">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </Link>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">{strategy.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
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
                      <span className="text-sm text-muted-foreground">
                        v{strategy.version}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Controls */}
                {strategy.status === "active" ? (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange("paused")}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                ) : strategy.status === "paused" ? (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange("active")}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange("active")}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Activate
                  </Button>
                )}

                {/* Test Execute */}
                <Button
                  variant="outline"
                  onClick={handleExecuteStrategy}
                  disabled={executing}
                >
                  {executing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <BarChart3 className="h-4 w-4 mr-2" />
                  )}
                  Test Execute
                </Button>

                {/* Edit Toggle */}
                <Button
                  variant={isEditing ? "default" : "outline"}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? "Cancel Edit" : "Edit Strategy"}
                </Button>

                {/* Save Changes (only when editing) */}
                {isEditing && (
                  <Button onClick={handleSaveChanges} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container max-w-7xl mx-auto px-6 py-8">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="logs">Execution Logs</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Strategy Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Strategy Name</Label>
                        <Input
                          id="name"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Describe your strategy..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-muted-foreground">Name</Label>
                        <p className="font-medium">{strategy.name}</p>
                      </div>
                      {strategy.description && (
                        <div>
                          <Label className="text-muted-foreground">
                            Description
                          </Label>
                          <p>{strategy.description}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Type</Label>
                          <p className="font-medium">
                            {strategy.type === "no-code"
                              ? "No-Code"
                              : strategy.type.toUpperCase()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Rules</Label>
                          <p className="font-medium">{strategy.rules.length}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">
                            Created
                          </Label>
                          <p className="font-medium">
                            {new Date(strategy.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">
                            Last Updated
                          </Label>
                          <p className="font-medium">
                            {new Date(strategy.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Net P&L</p>
                        <p className="text-2xl font-bold">
                          $
                          {(
                            strategy.currentPerformance?.netProfit || 0
                          ).toFixed(2)}
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
                        <p className="text-sm text-muted-foreground">
                          Win Rate
                        </p>
                        <p className="text-2xl font-bold">
                          {(strategy.metrics?.winRate || 0).toFixed(1)}%
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
                        <p className="text-sm text-muted-foreground">
                          Total Trades
                        </p>
                        <p className="text-2xl font-bold">
                          {strategy.metrics?.totalTrades || 0}
                        </p>
                      </div>
                      <Activity className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Profit Factor
                        </p>
                        <p className="text-2xl font-bold">
                          {(strategy.metrics?.profitFactor || 0).toFixed(2)}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Rules Tab */}
            <TabsContent value="rules" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Strategy Rules</CardTitle>
                  {isEditing && (
                    <Button onClick={addNewRule} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rule
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {editForm.rules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No rules configured</p>
                      {isEditing && (
                        <Button onClick={addNewRule} className="mt-4">
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Rule
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {editForm.rules.map((rule, index) => (
                        <RuleEditor
                          key={rule.id}
                          rule={rule}
                          isEditing={isEditing}
                          onUpdate={(updatedRule) =>
                            updateRule(index, updatedRule)
                          }
                          onRemove={() => removeRule(index)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Configuration Tab */}
            <TabsContent value="config" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Management Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <ConfigEditor
                    config={editForm.config}
                    isEditing={isEditing}
                    onUpdate={(config) =>
                      setEditForm((prev) => ({ ...prev, config }))
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Execution Logs Tab */}
            <TabsContent value="logs" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Execution Logs</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchExecutionLogs}
                    disabled={logsLoading}
                  >
                    {logsLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  {logsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : executionLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No execution logs yet</p>
                      <p className="text-sm">
                        Execute the strategy to see logs here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {executionLogs.map((log, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge
                                variant="outline"
                                className={getExecutionStatusColor(log.status)}
                              >
                                {log.status}
                              </Badge>
                              <span className="font-medium">{log.action}</span>
                              <span className="text-sm text-muted-foreground">
                                {log.symbol}
                              </span>
                              <span className="text-sm font-mono">
                                ${log.price.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {log.reason}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(log.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              Qty: {log.quantity}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Confidence: {log.confidence}%
                            </p>
                            {log.profit !== undefined && (
                              <p
                                className={`text-sm font-medium ${log.profit >= 0 ? "text-green-600" : "text-red-600"}`}
                              >
                                P&L: ${log.profit.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Queue Management Dialog */}
      <Dialog open={queueDialog} onOpenChange={setQueueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Strategy Queue Management
            </DialogTitle>
            <DialogDescription>
              This strategy is currently active in the execution queue.
              {queueAction === "pause" &&
                " To apply your changes, we'll temporarily pause it, update the configuration, and then resume execution."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Queue Management Process
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-amber-700 dark:text-amber-300">
                    <li>Pause strategy execution</li>
                    <li>Apply configuration changes</li>
                    <li>Resume strategy in queue</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQueueDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleQueueAction} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Update & Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Rule Editor Component
const RuleEditor = ({
  rule,
  isEditing,
  onUpdate,
  onRemove,
}: {
  rule: StrategyRule;
  isEditing: boolean;
  onUpdate: (rule: StrategyRule) => void;
  onRemove: () => void;
}) => {
  const updateRule = (field: string, value: any) => {
    onUpdate({ ...rule, [field]: value });
  };

  const updateCondition = (field: string, value: any) => {
    onUpdate({
      ...rule,
      condition: { ...rule.condition, [field]: value },
    });
  };

  const updateAction = (field: string, value: any) => {
    onUpdate({
      ...rule,
      action: { ...rule.action, [field]: value },
    });
  };

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <Input
              value={rule.name || ""}
              onChange={(e) => updateRule("name", e.target.value)}
              placeholder="Rule name"
              className="w-48"
            />
          ) : (
            <h4 className="font-medium">{rule.name || rule.id}</h4>
          )}
          <Badge variant={rule.isActive ? "default" : "secondary"}>
            {rule.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        {isEditing && (
          <div className="flex items-center gap-2">
            <Switch
              checked={rule.isActive}
              onCheckedChange={(checked) => updateRule("isActive", checked)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Condition */}
        <div className="space-y-3">
          <Label>Condition</Label>
          <div className="space-y-2">
            {isEditing ? (
              <>
                <Select
                  value={rule.condition.indicator}
                  onValueChange={(value) => updateCondition("indicator", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="rsi">RSI</SelectItem>
                    <SelectItem value="ema">EMA</SelectItem>
                    <SelectItem value="sma">SMA</SelectItem>
                    <SelectItem value="macd">MACD</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={rule.condition.operator}
                  onValueChange={(value) => updateCondition("operator", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="greater_than">Greater Than</SelectItem>
                    <SelectItem value="less_than">Less Than</SelectItem>
                    <SelectItem value="equal_to">Equal To</SelectItem>
                    <SelectItem value="crosses_above">Crosses Above</SelectItem>
                    <SelectItem value="crosses_below">Crosses Below</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={rule.condition.value}
                  onChange={(e) =>
                    updateCondition("value", parseFloat(e.target.value))
                  }
                  placeholder="Value"
                />
                <Input
                  value={rule.condition.symbol}
                  onChange={(e) => updateCondition("symbol", e.target.value)}
                  placeholder="Symbol (e.g., BTCUSDT)"
                />
              </>
            ) : (
              <p className="text-sm">
                {rule.condition.symbol} {rule.condition.indicator}{" "}
                {rule.condition.operator.replace("_", " ")}{" "}
                {rule.condition.value}
              </p>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="space-y-3">
          <Label>Action</Label>
          <div className="space-y-2">
            {isEditing ? (
              <>
                <Select
                  value={rule.action.type}
                  onValueChange={(value) => updateAction("type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                    <SelectItem value="HOLD">Hold</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={rule.action.quantity}
                    onChange={(e) =>
                      updateAction("quantity", parseFloat(e.target.value))
                    }
                    placeholder="Quantity"
                  />
                  <Select
                    value={rule.action.quantityType}
                    onValueChange={(value) =>
                      updateAction("quantityType", value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <p className="text-sm">
                {rule.action.type} {rule.action.quantity}
                {rule.action.quantityType === "percentage" ? "%" : ""}{" "}
                {rule.action.symbol || rule.condition.symbol}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Configuration Editor Component
const ConfigEditor = ({
  config,
  isEditing,
  onUpdate,
}: {
  config: StrategyConfig;
  isEditing: boolean;
  onUpdate: (config: StrategyConfig) => void;
}) => {
  const updateConfig = (field: string, value: any) => {
    onUpdate({ ...config, [field]: value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Risk Management
        </h4>

        <div className="space-y-3">
          <div>
            <Label>Risk Per Trade (%)</Label>
            {isEditing ? (
              <Input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={config.riskPerTrade}
                onChange={(e) =>
                  updateConfig("riskPerTrade", parseFloat(e.target.value))
                }
              />
            ) : (
              <p className="text-sm mt-1">{config.riskPerTrade}%</p>
            )}
          </div>

          <div>
            <Label>Stop Loss (%)</Label>
            {isEditing ? (
              <Input
                type="number"
                min="0.1"
                max="50"
                step="0.1"
                value={config.stopLoss}
                onChange={(e) =>
                  updateConfig("stopLoss", parseFloat(e.target.value))
                }
              />
            ) : (
              <p className="text-sm mt-1">{config.stopLoss}%</p>
            )}
          </div>

          <div>
            <Label>Take Profit (%)</Label>
            {isEditing ? (
              <Input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={config.takeProfit}
                onChange={(e) =>
                  updateConfig("takeProfit", parseFloat(e.target.value))
                }
              />
            ) : (
              <p className="text-sm mt-1">{config.takeProfit}%</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Execution Settings
        </h4>

        <div className="space-y-3">
          <div>
            <Label>Max Positions</Label>
            {isEditing ? (
              <Input
                type="number"
                min="1"
                max="20"
                value={config.maxPositions}
                onChange={(e) =>
                  updateConfig("maxPositions", parseInt(e.target.value))
                }
              />
            ) : (
              <p className="text-sm mt-1">{config.maxPositions}</p>
            )}
          </div>

          <div>
            <Label>Portfolio Allocation (%)</Label>
            {isEditing ? (
              <Input
                type="number"
                min="1"
                max="100"
                value={config.portfolioAllocation}
                onChange={(e) =>
                  updateConfig(
                    "portfolioAllocation",
                    parseFloat(e.target.value)
                  )
                }
              />
            ) : (
              <p className="text-sm mt-1">{config.portfolioAllocation}%</p>
            )}
          </div>

          <div>
            <Label>Cooldown Between Trades (minutes)</Label>
            {isEditing ? (
              <Input
                type="number"
                min="0"
                value={config.cooldownBetweenTrades}
                onChange={(e) =>
                  updateConfig(
                    "cooldownBetweenTrades",
                    parseInt(e.target.value)
                  )
                }
              />
            ) : (
              <p className="text-sm mt-1">
                {config.cooldownBetweenTrades} minutes
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label>Enable Risk Management</Label>
            {isEditing ? (
              <Switch
                checked={config.enableRiskManagement}
                onCheckedChange={(checked) =>
                  updateConfig("enableRiskManagement", checked)
                }
              />
            ) : (
              <Badge
                variant={config.enableRiskManagement ? "default" : "secondary"}
              >
                {config.enableRiskManagement ? "Enabled" : "Disabled"}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyDetailPage;
