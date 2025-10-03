import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MarketChart from "./MarketCharts";
import TradingTools from "@/components/TradingTools";
import {
  ArrowLeft,
  Building2,
  Globe,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react";
import { StockHistoricalData, StockQuote } from "@/lib/types/market";
import { marketService } from "@/services";

interface StockDetailsProps {
  symbol: string;
  period?: string;
  historical?: StockHistoricalData | null;
  quote: StockQuote;
  onBack: () => void;
}

const PERIODS = [
  { value: "1d", label: "1D" },
  { value: "5d", label: "5D" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "5y", label: "5Y" },
  { value: "max", label: "Max" },
];

const StockDetails = ({
  symbol,
  period: initialPeriod,
  historical: initialHistorical,
  quote,
  onBack,
}: StockDetailsProps) => {
  const [activeTab, setActiveTab] = useState("chart");
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [recentNews, setRecentNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod || "1y");
  const [historical, setHistorical] = useState<StockHistoricalData | null>(
    initialHistorical || null
  );
  const [chartLoading, setChartLoading] = useState(false);

  // Extract real market data from props
  const currentPrice = quote?.data?.price || 0;
  const change = quote?.data?.change || 0;
  const changePercent = quote?.data?.changePercent || 0;
  const isPositive = change >= 0;
  const volume = quote?.data?.volume || 0;
  const marketCap = quote?.data?.marketCap || 0;
  const peRatio = quote?.data?.pe || 0;
  const dayHigh = quote?.data?.dayHigh || 0;
  const dayLow = quote?.data?.dayLow || 0;
  const companyName = quote?.data?.name || marketService.getSymbolName(symbol);

  // Calculate 52-week high/low from historical data
  const yearlyData = historical?.data || [];
  const yearlyHigh =
    yearlyData.length > 0
      ? Math.max(...yearlyData.map((d) => d.high))
      : dayHigh * 1.15;
  const yearlyLow =
    yearlyData.length > 0
      ? Math.min(...yearlyData.map((d) => d.low))
      : dayLow * 0.85;

  // Fetch historical data when period changes
  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!symbol || !selectedPeriod) return;

      setChartLoading(true);
      try {
        const data = await marketService.getHistoricalData(
          symbol,
          selectedPeriod,
          "1d"
        );
        setHistorical(data);
      } catch (error) {
        console.error("Failed to fetch historical data:", error);
        setHistorical(null);
      } finally {
        setChartLoading(false);
      }
    };

    fetchHistoricalData();
  }, [symbol, selectedPeriod]);

  useEffect(() => {
    const fetchCompanyData = async () => {
      setLoading(true);
      try {
        // Try to fetch additional company info from the market service
        let additionalInfo = null;
        try {
          const companyData = await marketService.getCompanyInfo(symbol);
          if (companyData?.success && companyData?.data) {
            additionalInfo = companyData.data;
          }
        } catch (error) {
          console.log(
            "Additional company info not available, using basic data"
          );
        }

        // Set basic company info derived from real data
        const info = {
          name: companyName,
          sector: symbol.includes("USD")
            ? "Cryptocurrency"
            : symbol.includes("=F")
              ? "Commodities"
              : symbol.startsWith("^")
                ? "Index"
                : "Equity",
          marketCap: marketCap,
          peRatio: peRatio,
          dividend: additionalInfo?.financialData?.dividendYield?.raw || 0,
          employees: additionalInfo?.profile?.fullTimeEmployees || null,
          founded: additionalInfo?.profile?.founded || null,
          headquarters:
            additionalInfo?.profile?.city && additionalInfo?.profile?.state
              ? `${additionalInfo.profile.city}, ${additionalInfo.profile.state}`
              : "N/A",
          description:
            additionalInfo?.profile?.longBusinessSummary ||
            `${companyName} - Real-time market data and trading information.`,
          website: additionalInfo?.profile?.website || "N/A",
        };
        setCompanyInfo(info);

        // Mock news data (in a real app, you'd fetch from a news API)
        const mockNews = [
          {
            title: `${companyName} Reports Market Activity`,
            time: "2 hours ago",
            summary: "Latest market movements and trading activity analysis.",
          },
          {
            title: `Market Analysis: ${symbol} Performance`,
            time: "1 day ago",
            summary: "Technical analysis and market sentiment overview.",
          },
          {
            title: `Trading Update for ${symbol}`,
            time: "2 days ago",
            summary: "Recent trading patterns and volume analysis.",
          },
        ];
        setRecentNews(mockNews);
      } catch (error) {
        console.error("Failed to fetch company data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [symbol, companyName, marketCap, peRatio]);

  const keyStats = [
    {
      label: "Market Cap",
      value:
        marketCap > 0
          ? marketCap >= 1e12
            ? `$${(marketCap / 1e12).toFixed(2)}T`
            : marketCap >= 1e9
              ? `$${(marketCap / 1e9).toFixed(2)}B`
              : marketCap >= 1e6
                ? `$${(marketCap / 1e6).toFixed(2)}M`
                : `$${marketCap.toLocaleString()}`
          : "N/A",
      icon: Building2,
    },
    {
      label: "P/E Ratio",
      value: peRatio > 0 ? peRatio.toFixed(2) : "N/A",
      icon: BarChart3,
    },
    {
      label: "Dividend Yield",
      value:
        companyInfo?.dividend > 0
          ? `${(companyInfo.dividend * 100).toFixed(2)}%`
          : "N/A",
      icon: DollarSign,
    },
    {
      label: "Day High",
      value: dayHigh > 0 ? `$${dayHigh.toFixed(2)}` : "N/A",
      icon: TrendingUp,
    },
    {
      label: "Day Low",
      value: dayLow > 0 ? `$${dayLow.toFixed(2)}` : "N/A",
      icon: TrendingDown,
    },
    {
      label: "52W High",
      value: `$${yearlyHigh.toFixed(2)}`,
      icon: TrendingUp,
    },
    {
      label: "52W Low",
      value: `$${yearlyLow.toFixed(2)}`,
      icon: TrendingDown,
    },
    {
      label: "Volume",
      value: volume > 0 ? volume.toLocaleString() : "N/A",
      icon: BarChart3,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Market
              </Button>
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-2xl font-bold">{companyName}</h1>
                  <p className="text-muted-foreground">{symbol}</p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-4 justify-end mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Period:</span>
                  <Select
                    value={selectedPeriod}
                    onValueChange={setSelectedPeriod}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIODS.map((period) => (
                        <SelectItem key={period.value} value={period.value}>
                          {period.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-3xl font-bold font-mono">
                ${currentPrice.toLocaleString()}
              </div>
              <div
                className={`flex items-center gap-1 justify-end ${isPositive ? "text-success" : "text-destructive"}`}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-semibold">
                  {isPositive ? "+" : ""}${change.toFixed(2)} (
                  {isPositive ? "+" : ""}
                  {changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chart">Chart & Trading</TabsTrigger>
            <TabsTrigger value="overview">Company Overview</TabsTrigger>
            <TabsTrigger value="financials">Key Statistics</TabsTrigger>
            <TabsTrigger value="news">News & Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-6">
            <div className="grid lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                {chartLoading ? (
                  <Card className="h-[500px] flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground">
                        Loading chart data...
                      </p>
                    </div>
                  </Card>
                ) : historical ? (
                  <MarketChart
                    key={`chart-${symbol}-${selectedPeriod}`}
                    historical={historical}
                    height={500}
                  />
                ) : (
                  <Card className="h-[500px] flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <p className="text-muted-foreground">
                        No chart data available
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Try selecting a different period
                      </p>
                    </div>
                  </Card>
                )}
              </div>
              <div className="lg:col-span-1">
                <TradingTools symbol={symbol} price={quote?.data?.price} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="trading-gradient">
                  <CardHeader>
                    <CardTitle>Company Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loading ? (
                      <div className="space-y-4">
                        <div className="h-4 bg-muted animate-pulse rounded"></div>
                        <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                        <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                      </div>
                    ) : (
                      <>
                        <p className="text-muted-foreground leading-relaxed">
                          {companyInfo?.description}
                        </p>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Headquarters:
                              </span>
                              <span className="font-medium">
                                {companyInfo?.headquarters || "N/A"}
                              </span>
                            </div>
                            {companyInfo?.employees && (
                              <div className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  Employees:
                                </span>
                                <span className="font-medium">
                                  {companyInfo.employees.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            {companyInfo?.founded && (
                              <div className="flex items-center gap-2 text-sm">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  Founded:
                                </span>
                                <span className="font-medium">
                                  {companyInfo.founded}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <Badge variant="outline">
                                {companyInfo?.sector}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="trading-gradient">
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {keyStats.slice(0, 3).map((stat, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <stat.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {stat.label}
                          </span>
                        </div>
                        <span className="font-medium">{stat.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financials" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {keyStats.map((stat, index) => (
                <Card key={index} className="trading-gradient">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.label}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="news" className="space-y-6">
            <div className="grid gap-6">
              {recentNews.map((article, index) => (
                <Card
                  key={index}
                  className="trading-gradient hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-lg">
                          {article.title}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {article.time}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{article.summary}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StockDetails;
