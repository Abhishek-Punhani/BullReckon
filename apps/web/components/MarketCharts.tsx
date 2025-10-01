"use client";
import React, { useEffect, useRef, useState, memo } from "react";
import type { StockHistoricalData } from "../lib/types/market";

interface MarketChartProps {
  historical: StockHistoricalData | null;
  height?: number;
}

const COLORS = {
  text: "hsl(210, 40%, 98%)",
  grid: "hsl(222, 16%, 25%)",
  up: "hsl(142, 76%, 36%)",
  down: "hsl(0, 84%, 60%)",
  volumeBase: "hsl(213, 94%, 68%)",
};

// Global singleton to track the active chart instance
let globalActiveChartId: string | null = null;

const MarketChart = memo(function MarketChart({
  historical,
  height = 400,
}: MarketChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [chartReady, setChartReady] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [instanceId] = useState(() => Math.random().toString(36).substr(2, 9));

  // Only log when actually mounting/unmounting, not on every render
  useEffect(() => {
    // Remove any existing chart instances immediately
    const existingCharts = document.querySelectorAll("[data-chart-instance]");
    existingCharts.forEach((chart) => {
      if (chart.parentNode) {
        console.log("Removing existing chart instance");
        chart.parentNode.removeChild(chart);
      }
    });

    // Clear global state
    globalActiveChartId = null;

    // If there's already an active chart, don't mount this one
    if (globalActiveChartId && globalActiveChartId !== instanceId) {
      console.log(
        `Preventing duplicate chart mount. Active: ${globalActiveChartId}, Attempted: ${instanceId}`
      );
      return;
    }

    // Set this as the active chart
    globalActiveChartId = instanceId;
    console.log(`MarketChart instance ${instanceId} mounted and set as active`);

    // Add a data attribute to track this specific instance
    if (containerRef.current) {
      containerRef.current.setAttribute("data-chart-instance", instanceId);
    }

    return () => {
      console.log(`MarketChart instance ${instanceId} unmounted`);
      // Clear global active chart if this was the active one
      if (globalActiveChartId === instanceId) {
        globalActiveChartId = null;
      }
    };
  }, [instanceId]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Only initialize if this is the active chart instance
    if (globalActiveChartId !== instanceId) {
      console.log(
        `Skipping chart initialization for non-active instance: ${instanceId}`
      );
      return;
    }

    let chart: any = null;
    let series: any = null;
    let resizeObserver: ResizeObserver | null = null;

    const initChart = async () => {
      try {
        // Import the library and log what's available
        const lightweightCharts = await import("lightweight-charts");
        console.log(
          "Lightweight-charts exports:",
          Object.keys(lightweightCharts)
        );

        const { createChart } = lightweightCharts;

        if (!containerRef.current) return;

        // Create chart with proper options
        chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height,
          layout: {
            background: { color: "transparent" },
            textColor: COLORS.text,
          },
          grid: {
            vertLines: { color: COLORS.grid },
            horzLines: { color: COLORS.grid },
          },
          crosshair: {
            mode: 1,
          },
          rightPriceScale: {
            borderColor: COLORS.grid,
            textColor: COLORS.text,
          },
          timeScale: {
            borderColor: COLORS.grid,
            timeVisible: true,
            secondsVisible: false,
          },
        });

        console.log(
          "Chart created, available methods:",
          Object.getOwnPropertyNames(chart)
        );
        console.log(
          "Chart prototype methods:",
          Object.getOwnPropertyNames(Object.getPrototypeOf(chart))
        );

        // Try multiple methods to create a candlestick series
        try {
          // Method 1: Try CandlestickSeries constructor
          const { CandlestickSeries } = lightweightCharts;
          if (CandlestickSeries) {
            series = chart.addSeries(CandlestickSeries, {
              upColor: COLORS.up,
              downColor: COLORS.down,
              borderUpColor: COLORS.up,
              borderDownColor: COLORS.down,
              wickUpColor: COLORS.up,
              wickDownColor: COLORS.down,
            });
            console.log(
              "Candlestick series created with CandlestickSeries constructor"
            );
          } else {
            throw new Error("CandlestickSeries not available");
          }
        } catch (err1) {
          console.log("CandlestickSeries constructor failed:", err1);
          try {
            // Method 2: Try legacy addCandlestickSeries method
            series = (chart as any).addCandlestickSeries({
              upColor: COLORS.up,
              downColor: COLORS.down,
              borderUpColor: COLORS.up,
              borderDownColor: COLORS.down,
              wickUpColor: COLORS.up,
              wickDownColor: COLORS.down,
            });
            console.log(
              "Candlestick series created with legacy addCandlestickSeries"
            );
          } catch (err2) {
            console.log("Legacy addCandlestickSeries failed:", err2);
            // Fallback to line series since we know it works
            series = (chart as any).addLineSeries({
              color: COLORS.up,
              lineWidth: 2,
            });
            console.log("Fallback to line series");
          }
        }

        chartRef.current = chart;
        seriesRef.current = series;

        // Setup resize observer
        resizeObserver = new ResizeObserver((entries) => {
          if (chart && containerRef.current) {
            chart.resize(containerRef.current.clientWidth, height);
          }
        });
        resizeObserver.observe(containerRef.current);

        setChartReady(true);
        console.log("Chart initialized successfully");

        // Process initial data
        if (historical) {
          processData(historical, series, chart);
        }
      } catch (error) {
        console.error("Failed to initialize chart:", error);
        setChartError(`Chart initialization failed: ${error}`);
      }
    };

    initChart();

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (chart) {
        chart.remove();
      }
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height]);

  // Process data when historical changes
  useEffect(() => {
    if (chartReady && historical && seriesRef.current && chartRef.current) {
      processData(historical, seriesRef.current, chartRef.current);
    }
  }, [historical, chartReady]);

  const processData = (data: StockHistoricalData, series: any, chart: any) => {
    try {
      // Extract data array with proper type checking
      let histData: any[] = [];

      if (data && Array.isArray(data)) {
        // Direct array of candles
        histData = data;
      } else if (data && typeof data === "object" && "data" in data) {
        const nestedData = (data as any).data;
        if (Array.isArray(nestedData)) {
          // Nested in data property
          histData = nestedData;
        } else if (
          nestedData &&
          typeof nestedData === "object" &&
          "data" in nestedData &&
          Array.isArray(nestedData.data)
        ) {
          // Double nested
          histData = nestedData.data;
        }
      }

      if (!histData || histData.length === 0) {
        console.warn("No historical data available");
        return;
      }

      console.log(`Processing ${histData.length} data points`);

      // Try candlestick data format first
      try {
        const candlestickData = histData.map((item: any) => {
          const time = new Date(item.date).getTime() / 1000;
          return {
            time: time,
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
          };
        });

        candlestickData.sort((a, b) => a.time - b.time);

        // Try to set candlestick data
        series.setData(candlestickData);
        console.log("Candlestick data set successfully");
      } catch (candleError) {
        console.log(
          "Candlestick data failed, trying line format:",
          candleError
        );

        // Fallback to line data format
        const lineData = histData.map((item: any) => {
          const time = new Date(item.date).getTime() / 1000;
          return {
            time: time,
            value: parseFloat(item.close),
          };
        });

        lineData.sort((a, b) => a.time - b.time);
        series.setData(lineData);
        console.log("Line data set successfully as fallback");
      }

      // Fit content
      chart.timeScale().fitContent();

      console.log("Chart data set successfully");
    } catch (error) {
      console.error("Error processing chart data:", error);
      setChartError(`Data processing failed: ${error}`);
    }
  };

  // Only render if this is the active chart instance or if no active instance exists
  if (globalActiveChartId && globalActiveChartId !== instanceId) {
    console.log(`Not rendering non-active chart instance: ${instanceId}`);
    return null;
  }

  // Additional check: if there are multiple chart containers in DOM, only render the first one
  const existingCharts = document.querySelectorAll("[data-chart-instance]");
  if (existingCharts.length > 1) {
    const firstChart = existingCharts[0];
    const firstChartId = firstChart.getAttribute("data-chart-instance");
    if (firstChartId !== instanceId) {
      console.log(
        `Multiple charts detected, only rendering first: ${firstChartId}`
      );
      return null;
    }
  }

  return (
    <div
      id={`chart-container-${instanceId}`}
      style={{ width: "100%", height: `${height}px`, position: "relative" }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {chartError && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "20px",
            borderRadius: "8px",
            textAlign: "center",
            maxWidth: "80%",
          }}
        >
          <div>Chart Error</div>
          <div style={{ fontSize: "12px", marginTop: "8px" }}>{chartError}</div>
        </div>
      )}

      {!chartReady && !chartError && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: COLORS.text,
            textAlign: "center",
          }}
        >
          Loading chart...
        </div>
      )}
    </div>
  );
});

// Custom comparison function to prevent unnecessary re-renders
const areEqual = (prevProps: MarketChartProps, nextProps: MarketChartProps) => {
  // If both historical data are null, they're equal
  if (!prevProps.historical && !nextProps.historical) return true;

  // If only one is null, they're different
  if (!prevProps.historical || !nextProps.historical) return false;

  // Compare height
  if (prevProps.height !== nextProps.height) return false;

  // Compare historical data properties
  if (!prevProps.historical && !nextProps.historical) {
    return true; // Both null, no change
  }
  if (!prevProps.historical || !nextProps.historical) {
    return false; // One is null, the other isn't
  }

  // Both exist, compare data array lengths
  const prevData = Array.isArray(prevProps.historical)
    ? prevProps.historical
    : Array.isArray(prevProps.historical.data)
      ? prevProps.historical.data
      : [];
  const nextData = Array.isArray(nextProps.historical)
    ? nextProps.historical
    : Array.isArray(nextProps.historical.data)
      ? nextProps.historical.data
      : [];

  if (prevData.length !== nextData.length) {
    return false;
  }

  return true;
};

export default memo(MarketChart, areEqual);
