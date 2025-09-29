"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Shield,
  RefreshCw,
  AlertTriangle,
  TrendingDown,
  Settings,
  Save,
  TrendingUp,
} from "lucide-react";
import { calcService, authService } from "@/lib/services";
import Navigation from "@/components/Navigation";

interface RiskSettings {
  maxTradeSize: number;
  maxPortfolioRisk: number;
  stopLossPercent: number;
  takeProfitPercent: number;
}

const RiskPage = () => {
  const [settings, setSettings] = useState<RiskSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // UI state for switches
  const [autoStopLoss, setAutoStopLoss] = useState(true);
  const [autoTakeProfit, setAutoTakeProfit] = useState(true);
  const [positionSizing, setPositionSizing] = useState(true);

  const router = useRouter();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/auth/login");
      return;
    }
    loadRiskSettings();
  }, [router]);

  const loadRiskSettings = async () => {
    setIsLoading(true);
    try {
      const user = authService.getUser();
      const token = authService.getToken();
      if (!user || !token) return;
      const response = await calcService.getRiskSettings(token);
      // Map backend fields to frontend model
      const data = response.data;
      setSettings({
        maxTradeSize: data.maxTradeSize ?? 2500,
        maxPortfolioRisk: data.maxDrawdownPercentage ?? 20,
        stopLossPercent: data.stopLossPercentage ?? 5,
        takeProfitPercent: data.takeProfitPercentage ?? 10,
      });
    } catch (error) {
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSettings = async () => {
    setIsRefreshing(true);
    await loadRiskSettings();
    setIsRefreshing(false);
  };

  const handleChange = (field: keyof RiskSettings, value: number) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const user = authService.getUser();
      const token = authService.getToken();
      if (!user || !token || !settings) return;
      await calcService.updateRiskSettings(settings, token);
      await refreshSettings();
    } catch (error) {
      console.error("Error saving risk settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Apply preset configurations
  const applyPreset = (preset: "conservative" | "moderate" | "aggressive") => {
    const presets = {
      conservative: {
        maxTradeSize: 1000,
        maxPortfolioRisk: 10,
        stopLossPercent: 2,
        takeProfitPercent: 5,
      },
      moderate: {
        maxTradeSize: 2500,
        maxPortfolioRisk: 20,
        stopLossPercent: 5,
        takeProfitPercent: 10,
      },
      aggressive: {
        maxTradeSize: 5000,
        maxPortfolioRisk: 30,
        stopLossPercent: 10,
        takeProfitPercent: 20,
      },
    };
    setSettings(presets[preset]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="lg:pl-64">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading risk settings...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="lg:pl-64">
          <div className="flex items-center justify-center min-h-screen">
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="mb-2">No risk settings found.</p>
                <Button onClick={refreshSettings}>Retry</Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Calculate risk metrics
  const portfolioValue = 112500; // You can get this from your portfolio API
  const maxLossAmount = (portfolioValue * settings.maxPortfolioRisk) / 100;
  const positionSize = (portfolioValue * 25) / 100; // Assuming 25% allocation
  const riskToReward = settings.takeProfitPercent / settings.stopLossPercent;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="lg:pl-64">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Risk Management</h1>
              <p className="text-muted-foreground">
                Configure your risk parameters and protective measures
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={refreshSettings}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
              <Badge variant="outline" className="px-3 py-1">
                <Shield className="h-4 w-4 mr-2" />
                Active
              </Badge>
            </div>
          </div>

          {/* Risk Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-background to-muted/50 border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Max Drawdown
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  ${maxLossAmount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.maxPortfolioRisk}% of portfolio
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-background to-muted/50 border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Position Size
                </CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${positionSize.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">25% per trade</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-background to-muted/50 border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Risk Score
                </CardTitle>
                <Shield className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-500">
                  {Math.round((settings.maxPortfolioRisk + 25) / 2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Medium risk profile
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stop Loss Settings */}
            <Card className="bg-gradient-to-br from-background to-muted/50 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Stop Loss Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Stop Loss</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically apply stop losses to new positions
                    </p>
                  </div>
                  <Switch
                    checked={autoStopLoss}
                    onCheckedChange={setAutoStopLoss}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Default Stop Loss Percentage</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[settings.stopLossPercent]}
                        onValueChange={(value) =>
                          handleChange("stopLossPercent", value[0])
                        }
                        max={20}
                        min={1}
                        step={0.5}
                        className="flex-1"
                      />
                      <div className="w-16">
                        <Input
                          type="number"
                          value={settings.stopLossPercent}
                          onChange={(e) =>
                            handleChange(
                              "stopLossPercent",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          min={1}
                          max={20}
                          step={0.5}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>

                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">
                      A {settings.stopLossPercent}% stop loss means you'll exit
                      positions when they drop {settings.stopLossPercent}% below
                      your entry price.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Take Profit Settings */}
            <Card className="bg-gradient-to-br from-background to-muted/50 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Take Profit Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Take Profit</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically take profits at target levels
                    </p>
                  </div>
                  <Switch
                    checked={autoTakeProfit}
                    onCheckedChange={setAutoTakeProfit}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Default Take Profit Percentage</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[settings.takeProfitPercent]}
                        onValueChange={(value) =>
                          handleChange("takeProfitPercent", value[0])
                        }
                        max={50}
                        min={5}
                        step={1}
                        className="flex-1"
                      />
                      <div className="w-16">
                        <Input
                          type="number"
                          value={settings.takeProfitPercent}
                          onChange={(e) =>
                            handleChange(
                              "takeProfitPercent",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          min={5}
                          max={50}
                          step={1}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>

                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400">
                      A {settings.takeProfitPercent}% take profit means you'll
                      secure gains when positions rise{" "}
                      {settings.takeProfitPercent}% above your entry price.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Portfolio Risk Settings */}
            <Card className="bg-gradient-to-br from-background to-muted/50 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Portfolio Risk
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Max Trade Size ($)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      value={[settings.maxTradeSize]}
                      onValueChange={(value) =>
                        handleChange("maxTradeSize", value[0])
                      }
                      max={10000}
                      min={100}
                      step={100}
                      className="flex-1"
                    />
                    <div className="w-20">
                      <Input
                        type="number"
                        value={settings.maxTradeSize}
                        onChange={(e) =>
                          handleChange(
                            "maxTradeSize",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min={100}
                        max={10000}
                        step={100}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Maximum dollar amount per single trade
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Position Sizing</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable dynamic position sizing based on risk
                    </p>
                  </div>
                  <Switch
                    checked={positionSizing}
                    onCheckedChange={setPositionSizing}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Capital Allocation */}
            <Card className="bg-gradient-to-br from-background to-muted/50 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Capital Allocation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Max Portfolio Risk (%)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      value={[settings.maxPortfolioRisk]}
                      onValueChange={(value) =>
                        handleChange("maxPortfolioRisk", value[0])
                      }
                      max={50}
                      min={1}
                      step={1}
                      className="flex-1"
                    />
                    <div className="w-16">
                      <Input
                        type="number"
                        value={settings.maxPortfolioRisk}
                        onChange={(e) =>
                          handleChange(
                            "maxPortfolioRisk",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min={1}
                        max={50}
                        step={1}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Maximum percentage of portfolio at risk
                  </p>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    <strong>Risk-to-Reward Ratio:</strong> 1:
                    {riskToReward.toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    For every $1 risked, you target ${riskToReward.toFixed(1)}{" "}
                    in profit
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Presets */}
          <Card className="bg-gradient-to-br from-background to-muted/50 border-2">
            <CardHeader>
              <CardTitle>Risk Presets</CardTitle>
              <CardDescription>
                Quick setup options for different risk profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2 border-2 hover:border-green-500/50"
                  onClick={() => applyPreset("conservative")}
                >
                  <div className="font-medium text-green-600">Conservative</div>
                  <div className="text-sm text-muted-foreground text-left">
                    2% stop loss, 5% take profit, 10% max risk, $1K per trade
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2 border-2 hover:border-amber-500/50"
                  onClick={() => applyPreset("moderate")}
                >
                  <div className="font-medium text-amber-600">Moderate</div>
                  <div className="text-sm text-muted-foreground text-left">
                    5% stop loss, 10% take profit, 20% max risk, $2.5K per trade
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2 border-2 hover:border-red-500/50"
                  onClick={() => applyPreset("aggressive")}
                >
                  <div className="font-medium text-red-600">Aggressive</div>
                  <div className="text-sm text-muted-foreground text-left">
                    10% stop loss, 20% take profit, 30% max risk, $5K per trade
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Risk Warning */}
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-yellow-700 dark:text-yellow-400">
                    Risk Warning
                  </p>
                  <p className="text-muted-foreground">
                    These settings help you manage risk, but do not guarantee
                    protection against market losses. Always trade responsibly
                    and never invest more than you can afford to lose.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default RiskPage;
