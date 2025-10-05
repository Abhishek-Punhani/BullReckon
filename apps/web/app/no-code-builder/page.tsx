"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Blocks,
  Plus,
  Play,
  Save,
  Trash2,
  Settings,
  Loader2,
} from "lucide-react";
import {
  strategyService,
  type StrategyRule,
  type StrategyConfig,
  type CreateStrategyData,
} from "@/services/strategyService";

// Only price indicator is allowed for no-code builder
const INDICATORS = [{ value: "price", label: "Price" }];

const OPERATORS = [
  { value: "greater_than", label: ">" },
  { value: "less_than", label: "<" },
  { value: "equal_to", label: "=" },
  { value: "greater_equal", label: ">=" },
  { value: "less_equal", label: "<=" },
  { value: "crosses_above", label: "crosses above" },
  { value: "crosses_below", label: "crosses below" },
];

const TIMEFRAMES = [
  { value: "1m", label: "1 minute" },
  { value: "5m", label: "5 minutes" },
  { value: "15m", label: "15 minutes" },
  { value: "30m", label: "30 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "4h", label: "4 hours" },
  { value: "1d", label: "1 day" },
];

const NoCodeBuilder = () => {
  const [rules, setRules] = useState<StrategyRule[]>([]);
  const [strategyName, setStrategyName] = useState("");
  const [strategyDescription, setStrategyDescription] = useState("");
  const [config, setConfig] = useState<StrategyConfig>(
    strategyService.createDefaultConfig()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  const addRule = () => {
    const newRule: StrategyRule = {
      id: `rule_${Date.now()}`,
      name: "",
      condition: {
        indicator: "price",
        operator: OPERATORS[0].value,
        value: 100,
        symbol: "AAPL", // Default symbol
        timeframe: "1h",
      },
      action: {
        type: "BUY",
        quantity: 5,
        quantityType: "percentage",
        priceType: "market",
      },
      isActive: true,
      priority: rules.length + 1,
      cooldownMinutes: 0,
    };
    setRules([...rules, newRule]);
  };

  const removeRule = (ruleId: string) => {
    setRules(rules.filter((rule) => rule.id !== ruleId));
  };

  const updateRule = (ruleId: string, field: string, value: any) => {
    setRules(
      rules.map((rule) => {
        if (rule.id === ruleId) {
          const [section, property] = field.split(".");
          if (section === "condition") {
            return {
              ...rule,
              condition: { ...rule.condition, [property]: value },
            };
          } else if (section === "action") {
            return {
              ...rule,
              action: { ...rule.action, [property]: value },
            };
          } else {
            return { ...rule, [field]: value };
          }
        }
        return rule;
      })
    );
  };

  const updateConfig = (field: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateStrategy = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!strategyName.trim()) {
      errors.push("Strategy name is required");
    }

    if (rules.length === 0) {
      errors.push("At least one rule is required");
    }

    // Validate rules
    rules.forEach((rule, index) => {
      const ruleValidation = strategyService.validateRule(rule);
      if (!ruleValidation.valid) {
        errors.push(`Rule ${index + 1}: ${ruleValidation.errors.join(", ")}`);
      }
    });

    // Validate config
    const configValidation = strategyService.validateConfig(config);
    if (!configValidation.valid) {
      errors.push(...configValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  const saveStrategy = async () => {
    const validation = validateStrategy();
    if (!validation.valid) {
      toast({
        title: "Validation Error",
        description: validation.errors[0],
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const strategyData: CreateStrategyData = {
        name: strategyName.trim(),
        description: strategyDescription.trim(),
        type: "no-code",
        rules,
        config,
      };

      const savedStrategy = await strategyService.createStrategy(strategyData);

      toast({
        title: "Strategy Saved",
        description: `${strategyName} has been saved successfully.`,
      });

      // Redirect to strategy management page
      router.push("/strategy");
    } catch (error) {
      toast({
        title: "Save Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const runBacktest = async () => {
    const validation = validateStrategy();
    if (!validation.valid) {
      toast({
        title: "Validation Error",
        description: "Please fix validation errors before running backtest",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    try {
      // For now, simulate backtest
      await new Promise((resolve) => setTimeout(resolve, 3000));
      toast({
        title: "Backtest Complete",
        description:
          "Backtest simulation finished. Save the strategy to run real backtests.",
      });
    } catch (error) {
      toast({
        title: "Backtest Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getIndicatorDescription = (indicator: string) => {
    switch (indicator) {
      case "price":
        return "Current market price of the asset";
      default:
        return "Price";
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <div className="z-20">
        <Navigation />
      </div>
      {/* Main Content */}
      <div className="lg:ml-64 container max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div className="border-b bg-card/50 backdrop-blur-sm relative w-full z-10">
          <div className="container max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                    <Blocks className="h-7 w-7 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-4xl font-extrabold tracking-tight truncate">
                      No-Code Strategy Builder
                    </h1>
                    <p className="text-muted-foreground text-base mt-1">
                      Build algorithmic trading strategies with simple IF-THEN
                      rules
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  onClick={saveStrategy}
                  disabled={isSaving || isLoading}
                  variant="outline"
                  className="shadow glow-primary"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Strategy
                    </>
                  )}
                </Button>
                <Button
                  onClick={runBacktest}
                  disabled={isRunning || isLoading}
                  className="shadow glow-success"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Backtest
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="container max-w-7xl mx-auto px-6 py-8 space-y-8 flex-1">
          {/* Strategy Configuration */}
          <Card className="trading-gradient shadow trading-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Settings className="h-5 w-5" />
                Strategy Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Strategy Name</label>
                  <Input
                    value={strategyName}
                    onChange={(e) => setStrategyName(e.target.value)}
                    placeholder="Enter strategy name..."
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Description (Optional)
                  </label>
                  <Input
                    value={strategyDescription}
                    onChange={(e) => setStrategyDescription(e.target.value)}
                    placeholder="Brief description..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Risk Per Trade</label>
                  <Select
                    value={config.riskPerTrade.toString()}
                    onValueChange={(value) =>
                      updateConfig("riskPerTrade", Number(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1%</SelectItem>
                      <SelectItem value="2">2%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="15">15%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stop Loss</label>
                  <Select
                    value={config.stopLoss.toString()}
                    onValueChange={(value) =>
                      updateConfig("stopLoss", Number(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="15">15%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Take Profit</label>
                  <Select
                    value={config.takeProfit.toString()}
                    onValueChange={(value) =>
                      updateConfig("takeProfit", Number(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="15">15%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                      <SelectItem value="25">25%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Positions</label>
                  <Select
                    value={config.maxPositions.toString()}
                    onValueChange={(value) =>
                      updateConfig("maxPositions", Number(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Trading Rules */}
          <Card className="trading-gradient shadow trading-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Blocks className="h-5 w-5" />
                Trading Rules
              </CardTitle>
              <Button onClick={addRule} variant="outline" className="shadow">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {rules.map((rule, index) => (
                <div
                  key={rule.id}
                  className="p-4 border border-border rounded-lg space-y-4 bg-card/80 shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono"
                      >{`Rule ${index + 1}`}</Badge>
                      <span className="text-sm text-muted-foreground">
                        IF-THEN Logic
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRule(rule.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Rule Name */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">
                      Rule Name (Optional)
                    </label>
                    <Input
                      value={rule.name || ""}
                      onChange={(e) =>
                        updateRule(rule.id, "name", e.target.value)
                      }
                      placeholder="Enter rule name..."
                      className="text-sm"
                    />
                  </div>

                  {/* Condition */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium">🔍 IF (Condition)</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Symbol
                        </label>
                        <div className="relative">
                          <Input
                            value={rule.condition.symbol}
                            onChange={(e) =>
                              updateRule(
                                rule.id,
                                "condition.symbol",
                                e.target.value.toUpperCase()
                              )
                            }
                            placeholder="Enter symbol (e.g., AAPL)"
                            className="font-mono"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-xs text-muted-foreground">
                              📈
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          💡 Enter stock symbol (AAPL, GOOGL, TSLA, etc.)
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Indicator
                        </label>
                        <div className="px-3 py-2 border border-border rounded-md bg-muted/50">
                          <span className="text-sm font-medium">Price</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            (Fixed)
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Operator
                        </label>
                        <Select
                          value={rule.condition.operator}
                          onValueChange={(value) =>
                            updateRule(rule.id, "condition.operator", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Price Value ($)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            value={rule.condition.value}
                            onChange={(e) =>
                              updateRule(
                                rule.id,
                                "condition.value",
                                Number(e.target.value)
                              )
                            }
                            placeholder="100.00"
                            className="font-mono pl-7"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Timeframe
                        </label>
                        <Select
                          value={rule.condition.timeframe || "1h"}
                          onValueChange={(value) =>
                            updateRule(rule.id, "condition.timeframe", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEFRAMES.map((tf) => (
                              <SelectItem key={tf.value} value={tf.value}>
                                {tf.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      💡 {getIndicatorDescription(rule.condition.indicator)}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium">⚡ THEN (Action)</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Action
                        </label>
                        <Select
                          value={rule.action.type}
                          onValueChange={(value) =>
                            updateRule(rule.id, "action.type", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BUY">🟢 BUY</SelectItem>
                            <SelectItem value="SELL">🔴 SELL</SelectItem>
                            <SelectItem value="HOLD">🟡 HOLD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Quantity
                        </label>
                        <Input
                          type="number"
                          value={rule.action.quantity}
                          onChange={(e) =>
                            updateRule(
                              rule.id,
                              "action.quantity",
                              Number(e.target.value)
                            )
                          }
                          placeholder="0"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Type
                        </label>
                        <Select
                          value={rule.action.quantityType}
                          onValueChange={(value) =>
                            updateRule(rule.id, "action.quantityType", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">
                              % of Portfolio
                            </SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Cooldown (min)
                        </label>
                        <Input
                          type="number"
                          value={rule.cooldownMinutes || 0}
                          onChange={(e) =>
                            updateRule(
                              rule.id,
                              "cooldownMinutes",
                              Number(e.target.value)
                            )
                          }
                          placeholder="0"
                          className="font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rule Summary */}
                  <div className="bg-accent/50 p-3 rounded-lg text-sm font-mono">
                    <strong>Rule Summary:</strong> When {rule.condition.symbol}{" "}
                    price{" "}
                    {
                      OPERATORS.find(
                        (op) => op.value === rule.condition.operator
                      )?.label
                    }{" "}
                    ${rule.condition.value} on{" "}
                    {
                      TIMEFRAMES.find(
                        (tf) => tf.value === rule.condition.timeframe
                      )?.label
                    }
                    , {rule.action.type} {rule.action.quantity}
                    {rule.action.quantityType === "percentage"
                      ? "%"
                      : " units"}{" "}
                    of{" "}
                    {rule.action.quantityType === "percentage"
                      ? "portfolio"
                      : rule.condition.symbol}
                    .
                  </div>
                </div>
              ))}
              {rules.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Blocks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trading rules defined yet.</p>
                  <p className="text-sm">
                    Click "Add Rule" to create your first trading condition.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strategy Preview */}
          <Card className="trading-gradient shadow trading-shadow">
            <CardHeader>
              <CardTitle className="text-xl">Strategy Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Strategy Name:</strong>{" "}
                    {strategyName || "Unnamed Strategy"}
                  </div>
                  <div>
                    <strong>Description:</strong>{" "}
                    {strategyDescription || "No description"}
                  </div>
                  <div>
                    <strong>Total Rules:</strong> {rules.length}
                  </div>
                  <div>
                    <strong>Risk Per Trade:</strong> {config.riskPerTrade}%
                  </div>
                  <div>
                    <strong>Stop Loss:</strong> {config.stopLoss}%
                  </div>
                  <div>
                    <strong>Take Profit:</strong> {config.takeProfit}%
                  </div>
                  <div>
                    <strong>Max Positions:</strong> {config.maxPositions}
                  </div>
                  <div>
                    <strong>Portfolio Allocation:</strong>{" "}
                    {config.portfolioAllocation}%
                  </div>
                </div>

                {rules.length > 0 && (
                  <div className="space-y-2">
                    <strong className="text-sm">Execution Logic:</strong>
                    <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
                      {rules.map((rule, index) => (
                        <div key={rule.id}>
                          Rule {index + 1}: IF {rule.condition.symbol} price{" "}
                          {
                            OPERATORS.find(
                              (op) => op.value === rule.condition.operator
                            )?.label
                          }{" "}
                          ${rule.condition.value} → {rule.action.type}{" "}
                          {rule.action.quantity}
                          {rule.action.quantityType === "percentage"
                            ? "%"
                            : " units"}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Real-time Execution</Badge>
                  <Badge variant="outline">Risk Management</Badge>
                  <Badge variant="outline">Backtestable</Badge>
                  <Badge variant="outline">No-Code Strategy</Badge>
                  {config.enableRiskManagement && (
                    <Badge variant="outline">Auto Risk Management</Badge>
                  )}
                </div>

                {rules.length > 0 && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      💡 Your strategy is ready to be saved and deployed. After
                      saving, you can activate it from the Strategy Management
                      page.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NoCodeBuilder;
