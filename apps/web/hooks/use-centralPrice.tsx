import { centralPriceService } from "@/services";
import { PriceData } from "@/services/centralPriceService";
import { useState, useEffect, useRef, useCallback } from "react";

interface UseCentralPricesProps {
  symbols: string[];
  enabled?: boolean;
  subscriberId?: string;
}

interface UseCentralPricesReturn {
  prices: Record<string, PriceData>;
  isConnected: boolean;
  error: string | null;
  status: any;
  forceRefresh: () => Promise<void>;
}

export const useCentralPrices = ({
  symbols,
  enabled = true,
  subscriberId,
}: UseCentralPricesProps): UseCentralPricesReturn => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate unique subscriber ID
  const subscriberIdRef = useRef<string>(
    subscriberId ||
      `subscriber_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`
  );

  // Handle price updates from central service
  const handlePriceUpdate = useCallback(
    (newPrices: Record<string, PriceData>) => {
      setPrices((prevPrices) => ({
        ...prevPrices,
        ...newPrices,
      }));
      setIsConnected(true);
      setError(null);
    },
    []
  );

  // Subscribe to central price service
  useEffect(() => {
    if (!enabled || symbols.length === 0) {
      setIsConnected(false);
      return;
    }

    console.log(
      `📊 Component subscribing to central price service: ${symbols.join(", ")}`
    );

    try {
      centralPriceService.subscribe(
        subscriberIdRef.current,
        symbols,
        handlePriceUpdate
      );

      setError(null);
    } catch (err: any) {
      console.error("Failed to subscribe to price service:", err);
      setError(err.message);
      setIsConnected(false);
    }

    return () => {
      console.log(`📊 Component unsubscribing from central price service`);
      centralPriceService.unsubscribe(subscriberIdRef.current);
    };
  }, [symbols, enabled, handlePriceUpdate]);

  // Update subscription when symbols change
  useEffect(() => {
    if (enabled && symbols.length > 0) {
      centralPriceService.updateSubscription(subscriberIdRef.current, symbols);
    }
  }, [symbols, enabled]);

  // Force refresh function
  const forceRefresh = useCallback(async () => {
    try {
      await centralPriceService.forceRefresh();
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Get service status
  const status = centralPriceService.getStatus();

  return {
    prices,
    isConnected,
    error,
    status,
    forceRefresh,
  };
};
