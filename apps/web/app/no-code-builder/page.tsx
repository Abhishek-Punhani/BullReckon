"use client";
import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Blocks, Plus, Play, Save, Trash2, Settings } from "lucide-react";

// You may want to import SYMBOLS and INDICATORS from your data source
const SYMBOLS = [
  { value: "BTCUSDT", label: "BTCUSDT", icon: "₿" },
  { value: "ETHUSDT", label: "ETHUSDT", icon: "Ξ" },
  { value: "BNBUSDT", label: "BNBUSDT", icon: "🟡" },
];
const INDICATORS = [
  { value: "rsi", label: "RSI" },
  { value: "ema", label: "EMA" },
  { value: "macd", label: "MACD" },
  { value: "bollinger", label: "Bollinger Bands" },
  { value: "volume", label: "Volume" },
];

interface Rule {
  id: string;
  condition: {
    indicator: string;
    operator: string;
    value: string;
    symbol: string;
  };
  action: {
    type: "BUY" | "SELL";
    quantity: string;
    quantityType: "percentage" | "fixed";
  };
}

const NoCodeBuilder = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [strategyName, setStrategyName] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const operators = [
    { value: "greater_than", label: ">" },
    { value: "less_than", label: "<" },
    { value: "equal_to", label: "=" },
    { value: "greater_equal", label: ">=" },
    { value: "less_equal", label: "<=" },
    { value: "crosses_above", label: "crosses above" },
    { value: "crosses_below", label: "crosses below" },
  ];

  const addRule = () => {
    const newRule: Rule = {
      id: (rules.length + 1).toString(),
      condition: {
        indicator: INDICATORS[0].value,
        operator: operators[0].value,
        value: "",
        symbol: SYMBOLS[0].value,
      },
      action: {
        type: "BUY",
        quantity: "",
        quantityType: "percentage",
      },
    };
    setRules([...rules, newRule]);
  };

  const removeRule = (ruleId: string) => {
    setRules(rules.filter(rule => rule.id !== ruleId));
  };

  const updateRule = (ruleId: string, field: string, value: any) => {
    setRules(rules.map(rule => {
      if (rule.id === ruleId) {
        const [section, property] = field.split('.');
        if (section === 'condition') {
          return {
            ...rule,
            condition: { ...rule.condition, [property]: value },
          };
        } else if (section === 'action') {
          return {
            ...rule,
            action: { ...rule.action, [property]: value },
          };
        }
      }
      return rule;
    }));
  };

  const saveStrategy = async () => {
    if (!strategyName.trim()) {
      toast({
        title: "Missing Strategy Name",
        description: "Please provide a name for your strategy.",
        variant: "destructive",
      });
      return;
    }

    if (rules.length === 0) {
      toast({
        title: "No Rules Defined",
        description: "Please add at least one trading rule.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Strategy Saved",
      description: `${strategyName} has been saved successfully.`,
    });
  };

  const runBacktest = async () => {
    setIsRunning(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    toast({
      title: "Backtest Complete",
      description: "Backtest finished.",
    });
    setIsRunning(false);
  };

  const getIndicatorDescription = (indicator: string) => {
    switch (indicator) {
      case "rsi": return "Relative Strength Index (0-100)";
      case "ema": return "Exponential Moving Average";
      case "macd": return "MACD Line";
      case "bollinger": return "Bollinger Bands";
      case "volume": return "Trading Volume";
      default: return indicator;
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
                      Build algorithmic trading strategies with simple IF-THEN rules
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button onClick={saveStrategy} variant="outline" className="shadow glow-primary">
                  <Save className="h-4 w-4 mr-2" />
                  Save Strategy
                </Button>
                <Button onClick={runBacktest} disabled={isRunning} className="shadow glow-success">
                  <Play className="h-4 w-4 mr-2" />
                  {isRunning ? "Running..." : "Backtest"}
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Strategy Name</label>
                <Input
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  placeholder="Enter strategy name..."
                  className="font-mono"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Risk Per Trade</label>
                  <Select defaultValue="5">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1%</SelectItem>
                      <SelectItem value="2">2%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stop Loss</label>
                  <Select defaultValue="5">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="15">15%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Take Profit</label>
                  <Select defaultValue="10">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="15">15%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
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
                <div key={rule.id} className="p-4 border border-border rounded-lg space-y-4 bg-card/80 shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">{`Rule ${index + 1}`}</Badge>
                      <span className="text-sm text-muted-foreground">IF-THEN Logic</span>
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
                  {/* Condition */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium">🔍 IF (Condition)</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Symbol</label>
                        <Select 
                          value={rule.condition.symbol}
                          onValueChange={(value) => updateRule(rule.id, 'condition.symbol', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SYMBOLS.map((symbol) => (
                              <SelectItem key={symbol.value} value={symbol.value}>
                                {symbol.icon} {symbol.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Indicator</label>
                        <Select 
                          value={rule.condition.indicator}
                          onValueChange={(value) => updateRule(rule.id, 'condition.indicator', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INDICATORS.map((indicator) => (
                              <SelectItem key={indicator.value} value={indicator.value}>
                                {indicator.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Operator</label>
                        <Select 
                          value={rule.condition.operator}
                          onValueChange={(value) => updateRule(rule.id, 'condition.operator', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Value</label>
                        <Input
                          type="number"
                          value={rule.condition.value}
                          onChange={(e) => updateRule(rule.id, 'condition.value', e.target.value)}
                          placeholder="0"
                          className="font-mono"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      💡 {getIndicatorDescription(rule.condition.indicator)}
                    </div>
                  </div>
                  {/* Action */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium">⚡ THEN (Action)</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Action</label>
                        <Select 
                          value={rule.action.type}
                          onValueChange={(value) => updateRule(rule.id, 'action.type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BUY">🟢 BUY</SelectItem>
                            <SelectItem value="SELL">🔴 SELL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Quantity</label>
                        <Input
                          type="number"
                          value={rule.action.quantity}
                          onChange={(e) => updateRule(rule.id, 'action.quantity', e.target.value)}
                          placeholder="0"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Type</label>
                        <Select 
                          value={rule.action.quantityType}
                          onValueChange={(value) => updateRule(rule.id, 'action.quantityType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">% of Portfolio</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  {/* Rule Summary */}
                  <div className="bg-accent/50 p-3 rounded-lg text-sm font-mono">
                    <strong>Rule Summary:</strong> When {rule.condition.symbol} {rule.condition.indicator.toUpperCase()} {operators.find(op => op.value === rule.condition.operator)?.label} {rule.condition.value}, {rule.action.type} {rule.action.quantity}{rule.action.quantityType === 'percentage' ? '%' : ' units'} of {rule.action.quantityType === 'percentage' ? 'portfolio' : rule.condition.symbol}.
                  </div>
                </div>
              ))}
              {rules.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Blocks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trading rules defined yet.</p>
                  <p className="text-sm">Click "Add Rule" to create your first trading condition.</p>
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
                <div className="text-sm">
                  <strong>Strategy Name:</strong> {strategyName}
                </div>
                <div className="text-sm">
                  <strong>Total Rules:</strong> {rules.length}
                </div>
                {rules.length > 0 && (
                  <div className="space-y-2">
                    <strong className="text-sm">Execution Logic:</strong>
                    <div className="bg-muted/50 p-3 rounded-lg font-mono text-xs space-y-1">
                      {rules.map((rule, index) => (
                        <div key={rule.id}>
                          Rule {index + 1}: IF {rule.condition.symbol} {rule.condition.indicator.toUpperCase()} {operators.find(op => op.value === rule.condition.operator)?.label} {rule.condition.value} → {rule.action.type} {rule.action.quantity}{rule.action.quantityType === 'percentage' ? '%' : ' units'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Badge variant="outline">Real-time Execution</Badge>
                  <Badge variant="outline">Risk Management</Badge>
                  <Badge variant="outline">Backtestable</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NoCodeBuilder;
