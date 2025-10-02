import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { SYMBOLS, generateMockOHLCData } from "@/lib/mockData";
import { StockHistoricalData, StockQuote } from "@/lib/types/market";

interface StockDetailsProps {
  symbol: string;
  period: string;
  historical: StockHistoricalData;
  quote: StockQuote;
  onBack: () => void;
}

const StockDetails = ({
  symbol,
  period,
  historical,
  quote,
  onBack,
}: StockDetailsProps) => {
  const [activeTab, setActiveTab] = useState("chart");

  // Find the symbol data
  const symbolData = SYMBOLS.find((s) => s.value === symbol);

  // Generate current market data
  const data = generateMockOHLCData(symbol, 30);
  const latest = data[data.length - 1];
  const previous = data[data.length - 2];
  const change = latest.close - previous.close;
  const changePercent = (change / previous.close) * 100;
  const isPositive = change >= 0;

  // Mock company details
  const companyInfo = {
    name: symbolData?.label || symbol,
    sector: symbol.includes("USD") ? "Cryptocurrency" : "Technology",
    marketCap: 2.8e12,
    peRatio: 28.5,
    dividend: 0.88,
    employees: 181000,
    founded: 1976,
    headquarters: "Cupertino, CA",
    description: `${symbolData?.label || symbol} is a leading technology company that designs, manufactures, and markets consumer electronics, computer software, and online services worldwide.`,
    website: "https://www.apple.com",
  };

  const keyStats = [
    {
      label: "Market Cap",
      value: `$${(companyInfo.marketCap / 1e12).toFixed(2)}T`,
      icon: Building2,
    },
    {
      label: "P/E Ratio",
      value: companyInfo.peRatio.toString(),
      icon: BarChart3,
    },
    {
      label: "Dividend Yield",
      value: `${companyInfo.dividend}%`,
      icon: DollarSign,
    },
    {
      label: "52W High",
      value: `$${(latest.close * 1.15).toFixed(2)}`,
      icon: TrendingUp,
    },
    {
      label: "52W Low",
      value: `$${(latest.close * 0.85).toFixed(2)}`,
      icon: TrendingDown,
    },
    { label: "Volume", value: latest.volume.toLocaleString(), icon: BarChart3 },
  ];

  const recentNews = [
    {
      title: `${companyInfo.name} Reports Strong Q4 Earnings`,
      time: "2 hours ago",
      summary: "Company beats analyst expectations with record revenue growth.",
    },
    {
      title: `${companyInfo.name} Announces New Product Line`,
      time: "1 day ago",
      summary:
        "Innovation continues with groundbreaking technology advancements.",
    },
    {
      title: "Analyst Upgrades Rating to Buy",
      time: "2 days ago",
      summary:
        "Major investment firm raises price target citing strong fundamentals.",
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
                  <h1 className="text-2xl font-bold">{companyInfo.name}</h1>
                  <p className="text-muted-foreground">{symbol}</p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold font-mono">
                ${latest.close.toLocaleString()}
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
                <MarketChart
                  key={`chart-${symbol}-${period}`}
                  historical={historical}
                  height={500}
                />
              </div>
              <div className="lg:col-span-1">
                <TradingTools
                  symbol={symbol}
                  price={quote?.data?.price}
                />
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
                    <p className="text-muted-foreground leading-relaxed">
                      {companyInfo.description}
                    </p>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Headquarters:
                          </span>
                          <span className="font-medium">
                            {companyInfo.headquarters}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Employees:
                          </span>
                          <span className="font-medium">
                            {companyInfo.employees.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Founded:
                          </span>
                          <span className="font-medium">
                            {companyInfo.founded}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{companyInfo.sector}</Badge>
                        </div>
                      </div>
                    </div>
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
