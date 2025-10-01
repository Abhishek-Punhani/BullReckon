"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { tradeService } from "@/services";

interface TradingToolsProps {
  symbol: string;
  price: number | null;
}

export default function TradingTools({ symbol, price }: TradingToolsProps) {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState("buy");
  const [orderType, setOrderType] = useState("market");
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState(price ?? 0);
  const [stopPrice, setStopPrice] = useState(price ?? 0);
  const [stopLoss, setStopLoss] = useState(0);
  const [takeProfit, setTakeProfit] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleOrder = async () => {
    if (!price) {
      toast({
        title: "Error",
        description: "Could not get current price.",
        variant: "destructive",
      });
      return;
    }

    const orderDetails = {
      symbol,
      quantity: quantity,
      action: activeTab.toUpperCase(),
      source: orderType === "stop" ? "stop_loss" : orderType,
      limitPrice: orderType === "limit" ? limitPrice : undefined,
      stopPrice: orderType === "stop" ? stopPrice : undefined,
    };

    try {
      const result = await tradeService.placeOrder(orderDetails);
      toast({
        title: "Order Placed",
        description: `Successfully placed ${activeTab} order for ${quantity} of ${symbol}.`,
      });
      console.log("Order result:", result);
    } catch (error: any) {
      toast({
        title: "Order Failed",
        description: error.message || "Could not place order.",
        variant: "destructive",
      });
    }
  };

  const orderValue = (price ?? 0) * quantity;

  if (!isClient) {
    return (
      <Card className="trading-gradient">
        <div className="p-8 text-center">
          <div className="text-muted-foreground">Loading trading tools...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="trading-gradient">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <CardHeader className="p-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="sell">Sell</TabsTrigger>
          </TabsList>
        </CardHeader>
        <TabsContent value="buy">
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order-type-buy">Order Type</Label>
                <Select value={orderType} onValueChange={setOrderType}>
                  <SelectTrigger id="order-type-buy">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market</SelectItem>
                    <SelectItem value="limit">Limit</SelectItem>
                    <SelectItem value="stop">Stop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity-buy">Quantity</Label>
                <Input
                  id="quantity-buy"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min="1"
                />
              </div>
            </div>
            {orderType === "limit" && (
              <div className="space-y-2">
                <Label htmlFor="limit-price-buy">Limit Price</Label>
                <Input
                  id="limit-price-buy"
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(Number(e.target.value))}
                />
              </div>
            )}
            {orderType === "stop" && (
              <div className="space-y-2">
                <Label htmlFor="stop-price-buy">Stop Price</Label>
                <Input
                  id="stop-price-buy"
                  type="number"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(Number(e.target.value))}
                />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Stop Loss</Label>
                <span className="text-sm text-muted-foreground">
                  {stopLoss.toFixed(2)}%
                </span>
              </div>
              <Slider
                value={[stopLoss]}
                onValueChange={(v) => setStopLoss(v[0])}
                max={100}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Take Profit</Label>
                <span className="text-sm text-muted-foreground">
                  {takeProfit.toFixed(2)}%
                </span>
              </div>
              <Slider
                value={[takeProfit]}
                onValueChange={(v) => setTakeProfit(v[0])}
                max={100}
                step={0.1}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-4">
            <div className="flex justify-between w-full text-sm">
              <span>Order Value</span>
              <span>~${orderValue.toFixed(2)}</span>
            </div>
            <Button
              className="w-full bg-success hover:bg-success/90"
              onClick={handleOrder}
              suppressHydrationWarning
            >
              Buy {symbol}
            </Button>
          </CardFooter>
        </TabsContent>
        <TabsContent value="sell">
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order-type-sell">Order Type</Label>
                <Select value={orderType} onValueChange={setOrderType}>
                  <SelectTrigger id="order-type-sell">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market</SelectItem>
                    <SelectItem value="limit">Limit</SelectItem>
                    <SelectItem value="stop">Stop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity-sell">Quantity</Label>
                <Input
                  id="quantity-sell"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min="1"
                />
              </div>
            </div>
            {orderType === "limit" && (
              <div className="space-y-2">
                <Label htmlFor="limit-price-sell">Limit Price</Label>
                <Input
                  id="limit-price-sell"
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(Number(e.target.value))}
                />
              </div>
            )}
            {orderType === "stop" && (
              <div className="space-y-2">
                <Label htmlFor="stop-price-sell">Stop Price</Label>
                <Input
                  id="stop-price-sell"
                  type="number"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(Number(e.target.value))}
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-4">
            <div className="flex justify-between w-full text-sm">
              <span>Order Value</span>
              <span>~${orderValue.toFixed(2)}</span>
            </div>
            <Button
              className="w-full"
              variant="destructive"
              onClick={handleOrder}
              suppressHydrationWarning
            >
              Sell {symbol}
            </Button>
          </CardFooter>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
