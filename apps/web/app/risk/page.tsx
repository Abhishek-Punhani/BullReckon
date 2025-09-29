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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Shield, RefreshCw } from "lucide-react";
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
      const data = await calcService.getRiskSettings(user._id, token);
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

  const handleChange = (field: keyof RiskSettings, value: number) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const user = authService.getUser();
      const token = authService.getToken();
      if (!user || !token || !settings) return;
      await calcService.updateRiskSettings(user._id, settings, token);
      refreshSettings();
    } catch (error) {
      // handle error
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Loading risk settings...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="mb-2">No risk settings found.</p>
            <Button onClick={refreshSettings}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="lg:pl-64">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Risk Management</h1>
              <p className="text-muted-foreground">
                Configure your trading risk parameters
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
              <Badge variant="outline" className="px-3 py-1">
                <Shield className="h-4 w-4 mr-2" />
                Active
              </Badge>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Risk Settings</CardTitle>
              <CardDescription>
                Set your personal trading risk limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Max Trade Size ($)
                  </label>
                  <Input
                    type="number"
                    value={settings.maxTradeSize}
                    onChange={(e) =>
                      handleChange(
                        "maxTradeSize",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Max Portfolio Risk (%)
                  </label>
                  <Input
                    type="number"
                    value={settings.maxPortfolioRisk}
                    onChange={(e) =>
                      handleChange(
                        "maxPortfolioRisk",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Stop Loss (%)
                  </label>
                  <Input
                    type="number"
                    value={settings.stopLossPercent}
                    onChange={(e) =>
                      handleChange(
                        "stopLossPercent",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Take Profit (%)
                  </label>
                  <Input
                    type="number"
                    value={settings.takeProfitPercent}
                    onChange={(e) =>
                      handleChange(
                        "takeProfitPercent",
                        parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </div>
                <Button type="submit" disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save Settings
                </Button>
              </form>
            </CardContent>
          </Card>

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
                    protection against market losses. Always trade responsibly.
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
