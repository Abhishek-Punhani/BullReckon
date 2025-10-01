"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TradingTools from "./TradingTools";
import { StockHistoricalData, StockQuote } from "@/lib/types/market";

interface StockDetailsProps {
  symbol: string;
  quote: StockQuote | null;
  historical: StockHistoricalData | null;
}

export default function StockDetails({
  symbol,
  quote,
  historical,
}: StockDetailsProps) {
  const data = quote?.data;
  const company = data?.name || symbol;

  const details = [
    { label: "Market Cap", value: data?.marketCap?.toLocaleString() },
    { label: "Day High", value: data?.dayHigh?.toFixed(2) },
    { label: "Day Low", value: data?.dayLow?.toFixed(2) },
    { label: "P/E Ratio", value: data?.pe?.toFixed(2) },
    { label: "Volume", value: data?.volume?.toLocaleString() },
    {
      label: "Change",
      value: `${data?.change?.toFixed(2)} (${data?.changePercent?.toFixed(2)}%)`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{company}</CardTitle>
        <CardDescription>{symbol}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart" className="w-full">
          <TabsList>
            <TabsTrigger value="chart">Chart & Trading</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
          </TabsList>
          <TabsContent value="chart">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground">
                      Chart view has been moved to the main market page for
                      better visualization.
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div>
                <TradingTools
                  symbol={symbol}
                  price={quote?.data?.price ?? null}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Company Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {company} - Real-time market data and trading information.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {details.map((detail) => (
                    <div key={detail.label}>
                      <p className="text-sm font-medium">{detail.label}</p>
                      <p className="text-lg font-semibold">
                        {detail.value ?? "N/A"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
