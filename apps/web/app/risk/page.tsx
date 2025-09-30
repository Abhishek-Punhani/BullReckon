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
import { calcService, authService } from "@/services";
import Navigation from "@/components/Navigation";

interface RiskSettings {
  stopLossPercentage: number;
  autoStopLossEnabled: boolean;
  trailingStopEnabled: boolean;
  trailingStopPercentage: number;
  takeProfitPercentage: number;
  autoTakeProfitEnabled: boolean;
  maxDrawdownPercentage: number;
  capitalAllocationPercentage: number;
  positionSizingEnabled: boolean;
  maxPositionsAllowed: number;
  riskPreset: "conservative" | "moderate" | "aggressive" | "custom";
  correlationRiskEnabled: boolean;
  sectorConcentrationLimit: number;
  alertsEnabled: boolean;
  notificationChannels: string[];
}

const RiskPage = () => {
  const [settings, setSettings] = useState<RiskSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      const token = authService.getToken();
      if (!token) return;
      const response = await calcService.getRiskSettings(token);
      const data = response.data;
      setSettings(data);
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

  const handleChange = (field: keyof RiskSettings, value: number | boolean | string) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value, riskPreset: "custom" } : prev));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = authService.getToken();
      if (!token || !settings) return;
      
      await calcService.updateRiskSettings(settings, token);
      await refreshSettings();
    } catch (error) {
      console.error("Error saving risk settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Apply preset configurations - ONLY UPDATE LOCAL STATE
  const applyPreset = (preset: "conservative" | "moderate" | "aggressive") => {
    const presets = {
      conservative: {
        stopLossPercentage: 2,
        takeProfitPercentage: 5,
        maxDrawdownPercentage: 10,
        capitalAllocationPercentage: 10,
        maxPositionsAllowed: 15,
        autoStopLossEnabled: true,
        autoTakeProfitEnabled: true,
        trailingStopEnabled: false,
        trailingStopPercentage: 5,
        positionSizingEnabled: true,
        correlationRiskEnabled: true,
        sectorConcentrationLimit: 25,
        alertsEnabled: true,
        notificationChannels: [],
        riskPreset: preset as "conservative" | "moderate" | "aggressive" | "custom"
      },
      moderate: {
        stopLossPercentage: 5,
        takeProfitPercentage: 10,
        maxDrawdownPercentage: 20,
        capitalAllocationPercentage: 25,
        maxPositionsAllowed: 10,
        autoStopLossEnabled: true,
        autoTakeProfitEnabled: true,
        trailingStopEnabled: false,
        trailingStopPercentage: 5,
        positionSizingEnabled: true,
        correlationRiskEnabled: false,
        sectorConcentrationLimit: 40,
        alertsEnabled: true,
        notificationChannels: [],
        riskPreset: preset as "conservative" | "moderate" | "aggressive" | "custom"
      },
      aggressive: {
        stopLossPercentage: 10,
        takeProfitPercentage: 20,
        maxDrawdownPercentage: 35,
        capitalAllocationPercentage: 40,
        maxPositionsAllowed: 8,
        autoStopLossEnabled: true,
        autoTakeProfitEnabled: true,
        trailingStopEnabled: true,
        trailingStopPercentage: 5,
        positionSizingEnabled: true,
        correlationRiskEnabled: false,
        sectorConcentrationLimit: 60,
        alertsEnabled: true,
        notificationChannels: [],
        riskPreset: preset as "conservative" | "moderate" | "aggressive" | "custom"
      }
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
  const portfolioValue = 112500;
  const maxLossAmount = (portfolioValue * settings.maxDrawdownPercentage) / 100;
  const positionSize = (portfolioValue * settings.capitalAllocationPercentage) / 100;
  const riskToReward = settings.takeProfitPercentage / settings.stopLossPercentage;
  const riskScore = Math.round((settings.stopLossPercentage + settings.maxDrawdownPercentage + settings.capitalAllocationPercentage) / 3);

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
              <Badge 
                variant={settings.riskPreset === "custom" ? "outline" : "default"} 
                className="px-3 py-1"
              >
                <Shield className="h-4 w-4 mr-2" />
                {settings.riskPreset.charAt(0).toUpperCase() + settings.riskPreset.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Risk Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-background to-muted/50 border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  ${maxLossAmount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.maxDrawdownPercentage}% of portfolio
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-background to-muted/50 border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Position Size</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${positionSize.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.capitalAllocationPercentage}% per trade
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-background to-muted/50 border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
                <Shield className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-500">
                  {riskScore}/10
                </div>
                <p className="text-xs text-muted-foreground">
                  {settings.riskPreset} profile
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-background to-muted/50 border-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Max Positions</CardTitle>
                <Settings className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {settings.maxPositionsAllowed}
                </div>
                <p className="text-xs text-muted-foreground">
                  simultaneous positions
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
                    checked={settings.autoStopLossEnabled} 
                    onCheckedChange={(value) => handleChange("autoStopLossEnabled", value)} 
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Stop Loss Percentage</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[settings.stopLossPercentage]}
                        onValueChange={(value) => handleChange("stopLossPercentage", value[0])}
                        max={20}
                        min={0.5}
                        step={0.5}
                        className="flex-1"
                      />
                      <div className="w-16">
                        <Input
                          type="number"
                          value={settings.stopLossPercentage}
                          onChange={(e) => handleChange("stopLossPercentage", parseFloat(e.target.value) || 0)}
                          min={0.5}
                          max={20}
                          step={0.5}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Trailing Stop</Label>
                      <p className="text-sm text-muted-foreground">
                        Move stop loss as price moves favorably
                      </p>
                    </div>
                    <Switch 
                      checked={settings.trailingStopEnabled} 
                      onCheckedChange={(value) => handleChange("trailingStopEnabled", value)} 
                    />
                  </div>

                  {settings.trailingStopEnabled && (
                    <div>
                      <Label>Trailing Stop Percentage</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Slider
                          value={[settings.trailingStopPercentage]}
                          onValueChange={(value) => handleChange("trailingStopPercentage", value[0])}
                          max={30}
                          min={1}
                          step={0.5}
                          className="flex-1"
                        />
                        <div className="w-16">
                          <Input
                            type="number"
                            value={settings.trailingStopPercentage}
                            onChange={(e) => handleChange("trailingStopPercentage", parseFloat(e.target.value) || 0)}
                            min={1}
                            max={30}
                            step={0.5}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">
                      A {settings.stopLossPercentage}% stop loss means you'll exit positions when they drop{" "}
                      {settings.stopLossPercentage}% below your entry price.
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
                    checked={settings.autoTakeProfitEnabled} 
                    onCheckedChange={(value) => handleChange("autoTakeProfitEnabled", value)} 
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Take Profit Percentage</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[settings.takeProfitPercentage]}
                        onValueChange={(value) => handleChange("takeProfitPercentage", value[0])}
                        max={100}
                        min={1}
                        step={1}
                        className="flex-1"
                      />
                      <div className="w-16">
                        <Input
                          type="number"
                          value={settings.takeProfitPercentage}
                          onChange={(e) => handleChange("takeProfitPercentage", parseFloat(e.target.value) || 0)}
                          min={1}
                          max={100}
                          step={1}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>

                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400">
                      A {settings.takeProfitPercentage}% take profit means you'll secure gains when positions
                      rise {settings.takeProfitPercentage}% above your entry price.
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
                  <Label>Maximum Drawdown (%)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      value={[settings.maxDrawdownPercentage]}
                      onValueChange={(value) => handleChange("maxDrawdownPercentage", value[0])}
                      max={80}
                      min={5}
                      step={1}
                      className="flex-1"
                    />
                    <div className="w-16">
                      <Input
                        type="number"
                        value={settings.maxDrawdownPercentage}
                        onChange={(e) => handleChange("maxDrawdownPercentage", parseFloat(e.target.value) || 0)}
                        min={5}
                        max={80}
                        step={1}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div>
                  <Label>Max Positions Allowed</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      value={[settings.maxPositionsAllowed]}
                      onValueChange={(value) => handleChange("maxPositionsAllowed", value[0])}
                      max={50}
                      min={1}
                      step={1}
                      className="flex-1"
                    />
                    <div className="w-16">
                      <Input
                        type="number"
                        value={settings.maxPositionsAllowed}
                        onChange={(e) => handleChange("maxPositionsAllowed", parseFloat(e.target.value) || 0)}
                        min={1}
                        max={50}
                        step={1}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Position Sizing</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable dynamic position sizing based on risk
                    </p>
                  </div>
                  <Switch 
                    checked={settings.positionSizingEnabled} 
                    onCheckedChange={(value) => handleChange("positionSizingEnabled", value)} 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card className="bg-gradient-to-br from-background to-muted/50 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Advanced Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Capital Allocation per Trade (%)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      value={[settings.capitalAllocationPercentage]}
                      onValueChange={(value) => handleChange("capitalAllocationPercentage", value[0])}
                      max={100}
                      min={1}
                      step={1}
                      className="flex-1"
                    />
                    <div className="w-16">
                      <Input
                        type="number"
                        value={settings.capitalAllocationPercentage}
                        onChange={(e) => handleChange("capitalAllocationPercentage", parseFloat(e.target.value) || 0)}
                        min={1}
                        max={100}
                        step={1}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div>
                  <Label>Sector Concentration Limit (%)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      value={[settings.sectorConcentrationLimit]}
                      onValueChange={(value) => handleChange("sectorConcentrationLimit", value[0])}
                      max={100}
                      min={10}
                      step={5}
                      className="flex-1"
                    />
                    <div className="w-16">
                      <Input
                        type="number"
                        value={settings.sectorConcentrationLimit}
                        onChange={(e) => handleChange("sectorConcentrationLimit", parseFloat(e.target.value) || 0)}
                        min={10}
                        max={100}
                        step={5}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Correlation Risk Control</Label>
                    <p className="text-sm text-muted-foreground">
                      Prevent positions in highly correlated assets
                    </p>
                  </div>
                  <Switch 
                    checked={settings.correlationRiskEnabled} 
                    onCheckedChange={(value) => handleChange("correlationRiskEnabled", value)} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Risk Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications for risk violations
                    </p>
                  </div>
                  <Switch 
                    checked={settings.alertsEnabled} 
                    onCheckedChange={(value) => handleChange("alertsEnabled", value)} 
                  />
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    <strong>Risk-to-Reward Ratio:</strong> 1:{riskToReward.toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    For every $1 risked, you target ${riskToReward.toFixed(1)} in profit
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Presets */}
       <Card className="bg-gradient-to-br from-background to-muted/50 border-2 shadow-lg rounded-2xl">
  <CardHeader>
    <CardTitle className="text-lg font-semibold flex items-center gap-2">
      <Shield className="h-5 w-5 text-primary" />
      Risk Presets
    </CardTitle>
    <CardDescription className="text-muted-foreground">
      Quick setup options for different risk profiles
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Conservative */}
      <Button
        variant="outline"
        className={`w-full h-auto p-5 flex flex-col items-start gap-3 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-green-500/70 hover:bg-green-50/40 ${
          settings.riskPreset === "conservative"
            ? "border-green-600 bg-gradient-to-br from-green-50 to-green-100/60 shadow-lg shadow-green-200 ring-2 ring-green-400/40"
            : "border-gray-200"
        }`}
        onClick={() => applyPreset("conservative")}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-green-700">Conservative</span>
          </div>
          {settings.riskPreset === "conservative" && (
            <span className="text-green-600 text-xs font-bold px-2 py-0.5 bg-green-100 rounded-full shadow-sm">
              ✓ Selected
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground text-left leading-relaxed">
          2% stop loss, 5% take profit,<br />
          10% max drawdown, 10% allocation
        </div>
      </Button>

      {/* Moderate */}
      <Button
        variant="outline"
        className={`w-full h-auto p-5 flex flex-col items-start gap-3 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-amber-500/70 hover:bg-amber-50/40 ${
          settings.riskPreset === "moderate"
            ? "border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100/60 shadow-lg shadow-amber-200 ring-2 ring-amber-400/40"
            : "border-gray-200"
        }`}
        onClick={() => applyPreset("moderate")}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-500" />
            <span className="font-semibold text-amber-700">Moderate</span>
          </div>
          {settings.riskPreset === "moderate" && (
            <span className="text-amber-600 text-xs font-bold px-2 py-0.5 bg-amber-100 rounded-full shadow-sm">
              ✓ Selected
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground text-left leading-relaxed">
          5% stop loss, 10% take profit,<br />
          20% max drawdown, 25% allocation
        </div>
      </Button>

      {/* Aggressive */}
      <Button
        variant="outline"
        className={`w-full h-auto p-5 flex flex-col items-start gap-3 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-red-500/70 hover:bg-red-50/40 ${
          settings.riskPreset === "aggressive"
            ? "border-red-500 bg-gradient-to-br from-red-50 to-red-100/60 shadow-lg shadow-red-200 ring-2 ring-red-400/40"
            : "border-gray-200"
        }`}
        onClick={() => applyPreset("aggressive")}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            <span className="font-semibold text-red-700">Aggressive</span>
          </div>
          {settings.riskPreset === "aggressive" && (
            <span className="text-red-600 text-xs font-bold px-2 py-0.5 bg-red-100 rounded-full shadow-sm">
              ✓ Selected
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground text-left leading-relaxed">
          10% stop loss, 20% take profit,<br />
          35% max drawdown, 40% allocation
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