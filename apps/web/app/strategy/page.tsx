"use client";
import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  Plus,
  TestTube,
  Play,
  Pause,
  Settings,
  TrendingUp,
} from "lucide-react";

interface Strategy {
  id: string;
  name: string;
  url: string;
  api_key: string;
  status: "active" | "inactive" | "testing";
  last_signal?: {
    action: "BUY" | "SELL" | "HOLD";
    symbol: string;
    quantity: number;
    confidence: number;
    timestamp: string;
  };
}

const Strategy = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([
    {
      id: "1",
      name: "Moving Average Crossover",
      url: "https://api.example.com/strategy/ma-crossover",
      api_key: "sk-1234567890",
      status: "active",
      last_signal: {
        action: "BUY",
        symbol: "BTCUSDT",
        quantity: 0.5,
        confidence: 85,
        timestamp: "2025-09-23T14:30:00Z",
      },
    },
    {
      id: "2",
      name: "RSI Momentum",
      url: "https://api.example.com/strategy/rsi-momentum",
      api_key: "sk-0987654321",
      status: "inactive",
    },
  ]);

  const [newStrategy, setNewStrategy] = useState({
    name: "",
    url: "",
    api_key: "",
    description: "",
  });

  const [isAddingStrategy, setIsAddingStrategy] = useState(false);
  const [testingStrategy, setTestingStrategy] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAddStrategy = async () => {
    if (!newStrategy.name || !newStrategy.url) {
      toast({
        title: "Missing Information",
        description: "Please fill in at least the strategy name and URL.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingStrategy(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const strategy: Strategy = {
      id: (strategies.length + 1).toString(),
      name: newStrategy.name,
      url: newStrategy.url,
      api_key: newStrategy.api_key,
      status: "inactive",
    };

    setStrategies((prev) => [...prev, strategy]);
    setNewStrategy({ name: "", url: "", api_key: "", description: "" });

    toast({
      title: "Strategy Added",
      description: "Your trading strategy has been successfully added.",
    });

    setIsAddingStrategy(false);
  };

  const testStrategy = async (strategyId: string) => {
    setTestingStrategy(strategyId);

    // Simulate API test
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock response
    const mockSignal = {
      action: "BUY" as const,
      symbol: "ETHUSDT",
      quantity: 2.5,
      confidence: 78,
      timestamp: new Date().toISOString(),
    };

    setStrategies((prev) =>
      prev.map((s) =>
        s.id === strategyId
          ? { ...s, last_signal: mockSignal, status: "testing" as const }
          : s
      )
    );

    toast({
      title: "Strategy Test Complete",
      description: `Received signal: ${mockSignal.action} ${mockSignal.quantity} ${mockSignal.symbol} (${mockSignal.confidence}% confidence)`,
    });

    setTestingStrategy(null);
  };

  const toggleStrategy = (strategyId: string) => {
    setStrategies((prev) =>
      prev.map((s) =>
        s.id === strategyId
          ? { ...s, status: s.status === "active" ? "inactive" : "active" }
          : s
      )
    );

    const strategy = strategies.find((s) => s.id === strategyId);
    toast({
      title: `Strategy ${strategy?.status === "active" ? "Deactivated" : "Activated"}`,
      description: `${strategy?.name} has been ${strategy?.status === "active" ? "stopped" : "started"}.`,
    });
  };

  const getStatusColor = (status: Strategy["status"]) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "testing":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "inactive":
        return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "BUY":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20";
      case "SELL":
        return "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20";
      case "HOLD":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20";
      default:
        return "";
    }
  };

  return (
    <div className="flex min-h-screen bg-background relative">
      {/* Wrap Navigation with a higher z-index so it always stays in front */}
      <div className="z-20">
        <Navigation />
      </div>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header Section with a lower z-index */}
        <div className="border-b bg-card/50 backdrop-blur-sm relative w-full z-10">
          <div className="container max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                    <TrendingUp className="h-7 w-7 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-4xl font-extrabold tracking-tight truncate">
                      Strategy API
                    </h1>
                    <p className="text-base text-muted-foreground mt-2 truncate">
                      Connect and manage your algorithmic trading strategies
                    </p>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs px-4 py-2 shrink-0 font-semibold">
                {strategies.filter((s) => s.status === "active").length} Active
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container max-w-7xl mx-auto px-6 py-8 space-y-8 flex-1">
          {/* Add New Strategy Section */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Plus className="h-5 w-5 text-primary" />
                Add New Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="strategy-name"
                      className="text-sm font-medium"
                    >
                      Strategy Name
                    </Label>
                    <Input
                      id="strategy-name"
                      placeholder="e.g., Golden Cross Strategy"
                      value={newStrategy.name}
                      onChange={(e) =>
                        setNewStrategy((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="strategy-url"
                      className="text-sm font-medium"
                    >
                      API Endpoint URL
                    </Label>
                    <Input
                      id="strategy-url"
                      placeholder="https://api.yourstrategy.com/signals"
                      value={newStrategy.url}
                      onChange={(e) =>
                        setNewStrategy((prev) => ({
                          ...prev,
                          url: e.target.value,
                        }))
                      }
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key" className="text-sm font-medium">
                    API Key{" "}
                    <span className="text-muted-foreground font-normal">
                      (Optional)
                    </span>
                  </Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Your API key for authentication"
                    value={newStrategy.api_key}
                    onChange={(e) =>
                      setNewStrategy((prev) => ({
                        ...prev,
                        api_key: e.target.value,
                      }))
                    }
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description{" "}
                    <span className="text-muted-foreground font-normal">
                      (Optional)
                    </span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your strategy's approach and parameters..."
                    value={newStrategy.description}
                    onChange={(e) =>
                      setNewStrategy((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <Button
                  onClick={handleAddStrategy}
                  disabled={isAddingStrategy}
                  size="lg"
                  className="w-full md:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isAddingStrategy ? "Adding Strategy..." : "Add Strategy"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Strategies Section */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight truncate">
                Your Strategies
              </h2>
              <div className="text-sm text-muted-foreground shrink-0">
                {strategies.length}{" "}
                {strategies.length === 1 ? "strategy" : "strategies"}
              </div>
            </div>

            <div className="space-y-4">
              {strategies.map((strategy) => (
                <Card
                  key={strategy.id}
                  className="border-2 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* Strategy Header */}
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                              <Bot className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 min-w-0">
                                <h3 className="text-lg font-semibold truncate">
                                  {strategy.name}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className={getStatusColor(strategy.status)}
                                >
                                  {strategy.status.charAt(0).toUpperCase() +
                                    strategy.status.slice(1)}
                                </Badge>
                              </div>
                              <div className="space-y-1 text-sm">
                                <p className="text-muted-foreground">
                                  <span className="font-medium">Endpoint:</span>{" "}
                                  <code className="px-2 py-0.5 bg-muted rounded text-xs break-all">
                                    {strategy.url}
                                  </code>
                                </p>
                                <p className="text-muted-foreground">
                                  <span className="font-medium">API Key:</span>{" "}
                                  <code className="px-2 py-0.5 bg-muted rounded text-xs">
                                    {strategy.api_key
                                      ? "••••••••" + strategy.api_key.slice(-4)
                                      : "Not configured"}
                                  </code>
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Latest Signal */}
                          {strategy.last_signal && (
                            <div className="p-4 bg-muted/50 rounded-lg border">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="text-sm font-semibold">
                                  Latest Signal
                                </div>
                                <Badge
                                  variant="outline"
                                  className={getActionBadgeColor(
                                    strategy.last_signal.action
                                  )}
                                >
                                  {strategy.last_signal.action}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Symbol
                                  </div>
                                  <div className="font-semibold">
                                    {strategy.last_signal.symbol}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Quantity
                                  </div>
                                  <div className="font-semibold">
                                    {strategy.last_signal.quantity}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Confidence
                                  </div>
                                  <div className="font-semibold flex items-center gap-1">
                                    {strategy.last_signal.confidence}%
                                    <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary rounded-full"
                                        style={{
                                          width: `${strategy.last_signal.confidence}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Time
                                  </div>
                                  <div className="font-semibold text-sm">
                                    {new Date(
                                      strategy.last_signal.timestamp
                                    ).toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testStrategy(strategy.id)}
                            disabled={testingStrategy === strategy.id}
                            className="h-9"
                          >
                            <TestTube className="h-4 w-4 mr-1.5" />
                            {testingStrategy === strategy.id
                              ? "Testing..."
                              : "Test"}
                          </Button>

                          <Button
                            variant={
                              strategy.status === "active"
                                ? "destructive"
                                : "default"
                            }
                            size="sm"
                            onClick={() => toggleStrategy(strategy.id)}
                            className="h-9"
                          >
                            {strategy.status === "active" ? (
                              <>
                                <Pause className="h-4 w-4 mr-1.5" />
                                Stop
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1.5" />
                                Start
                              </>
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {strategies.length === 0 && (
                <Card className="border-2 border-dashed">
                  <CardContent className="p-12 text-center">
                    <div className="inline-flex p-4 bg-muted rounded-full mb-4">
                      <Bot className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      No Strategies Yet
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                      Add your first algorithmic trading strategy to start
                      automating your trades.
                    </p>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Strategy
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* API Documentation Section */}
          <Card className="border-2">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-xl">Strategy API Format</CardTitle>
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
    </div>
  );
};

export default Strategy;
