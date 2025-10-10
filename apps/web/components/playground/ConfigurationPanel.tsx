import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Code, Play, RotateCcw } from "lucide-react";
import Link from "next/link";
import { SUPPORTED_LANGUAGES } from "./languages";

interface ConfigurationPanelProps {
  language: string;
  setLanguage: (language: string) => void;
  code: string;
  setCode: (code: string) => void;
  apiKey: string;
  setApiKey: (apiKey: string) => void;
  isBacktesting: boolean;
  setIsBacktesting: (isBacktesting: boolean) => void;
  isRunning: boolean;
  onRunCode: () => void;
  onReset: () => void;
}

const ConfigurationPanel = ({
  language,
  setLanguage,
  setCode,
  apiKey,
  setApiKey,
  isBacktesting,
  setIsBacktesting,
  isRunning,
  onRunCode,
  onReset,
}: ConfigurationPanelProps) => {
  const handleLanguageChange = (newLanguage: string) => {
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.value === newLanguage);
    if (langConfig) {
      setLanguage(newLanguage);
      setCode(langConfig.defaultCode);
    }
  };

  return (
    <Card className="trading-gradient">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="language">Programming Language</Label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mode">Execution Mode</Label>
            <Select
              value={isBacktesting ? "backtesting" : "live"}
              onValueChange={(value) =>
                setIsBacktesting(value === "backtesting")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backtesting">Backtesting</SelectItem>
                <SelectItem value="live">Live Trading</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">
              API Key{" "}
              {!isBacktesting && <span className="text-destructive">*</span>}
            </Label>
            {apiKey ? (
              <Input
                id="api-key"
                type="password"
                placeholder={
                  isBacktesting
                    ? "Not required for backtest"
                    : "Enter your API key"
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isBacktesting}
              />
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  No API keys found
                </p>
                <Link
                  href="/strategy"
                  className="text-sm text-primary hover:underline"
                >
                  Create API key
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onRunCode} disabled={isRunning}>
            <Play className="h-4 w-4 mr-2" />
            {isRunning
              ? "Running..."
              : `Run ${isBacktesting ? "Backtest" : "Strategy"}`}
          </Button>
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfigurationPanel;
