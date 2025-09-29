"use client";
import React, { useEffect, useRef } from "react";
import type {
  IChartApi,
  DeepPartial,
  ChartOptions,
  CandlestickData,
} from "lightweight-charts";
import type { StockHistoricalData } from "../lib/types/market";

interface MarketChartProps {
  historical: StockHistoricalData | null;
  height?: number;
}

// Colors copied from mock TradingChart for a consistent theme
const COLORS = {
  text: "hsl(210, 40%, 98%)",
  grid: "hsl(222, 16%, 25%)",
  up: "hsl(142, 76%, 36%)",
  down: "hsl(0, 84%, 60%)",
  volumeBase: "hsl(213, 94%, 68%)",
};

export default function MarketChart({
  historical,
  height = 400,
}: MarketChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<any | null>(null);
  const volumeRef = useRef<any | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const options: DeepPartial<ChartOptions> = {
      layout: {
        background: { color: "transparent" },
        textColor: COLORS.text,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: COLORS.grid, textColor: COLORS.text },
      timeScale: {
        borderColor: COLORS.grid,
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height,
    };

    let ro: ResizeObserver | null = null;
    let cancelled = false;

    (async () => {
      const lw = await import("lightweight-charts");

      if (cancelled || !containerRef.current) return;

      const createChartFn =
        (lw as any).createChart ??
        (lw as any).default?.createChart ??
        (lw as any).default ??
        null;
      if (typeof createChartFn !== "function") {
        // eslint-disable-next-line no-console
        console.error("createChart not found on lightweight-charts import", lw);
        return;
      }

      chartRef.current = createChartFn(containerRef.current, options as any);

      // Try multiple ways to add candlestick + histogram series depending on module shape
      const CandlestickSeries = (lw as any).CandlestickSeries ?? null;
      const HistogramSeries = (lw as any).HistogramSeries ?? null;

      try {
        if (
          typeof (chartRef.current as any).addSeries === "function" &&
          CandlestickSeries &&
          HistogramSeries
        ) {
          // ESM build that exports series constructors
          candleRef.current = (chartRef.current as any).addSeries(
            CandlestickSeries,
            {
              upColor: COLORS.up,
              downColor: COLORS.down,
              borderUpColor: COLORS.up,
              borderDownColor: COLORS.down,
              wickUpColor: COLORS.up,
              wickDownColor: COLORS.down,
            }
          );

          volumeRef.current = (chartRef.current as any).addSeries(
            HistogramSeries,
            {
              color: COLORS.volumeBase,
              priceFormat: { type: "volume" },
              priceScaleId: "",
            }
          );
        } else if (
          typeof (chartRef.current as any).addCandlestickSeries === "function"
        ) {
          // older factory methods
          candleRef.current = (chartRef.current as any).addCandlestickSeries({
            upColor: COLORS.up,
            downColor: COLORS.down,
            borderUpColor: COLORS.up,
            borderDownColor: COLORS.down,
            wickUpColor: COLORS.up,
            wickDownColor: COLORS.down,
          });

          // histogram factory name may vary
          if (
            typeof (chartRef.current as any).addHistogramSeries === "function"
          ) {
            volumeRef.current = (chartRef.current as any).addHistogramSeries({
              color: COLORS.volumeBase,
              priceFormat: { type: "volume" },
              priceScaleId: "",
            });
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to create series", err);
      }

      // Configure volume scale margins if available
      try {
        volumeRef.current
          ?.priceScale()
          ?.applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      } catch {
        // ignore
      }

      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => {
          if (!containerRef.current || !chartRef.current) return;
          chartRef.current.resize(containerRef.current.clientWidth, height);
        });
        ro.observe(containerRef.current);
      }
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      try {
        (chartRef.current as any)?.remove?.();
      } catch {}
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
    };
  }, [height]);

  // update series data when historical changes
  useEffect(() => {
    if (!chartRef.current || !historical) return;

    // Convert whatever date format to UTCTimestamp (seconds)
    const toTime = (d: any) => {
      if (typeof d === "number") return Math.floor(d as number);
      // if already in YYYY-MM-DD format, convert to seconds
      const t = new Date(String(d)).getTime();
      return Math.floor(t / 1000);
    };

    const candleData: CandlestickData[] = historical.data.map((d) => ({
      // cast time to any/UTCTimestamp (number seconds) for compatibility
      time: toTime(d.date) as any,
      open: Number(d.open),
      high: Number(d.high),
      low: Number(d.low),
      close: Number(d.close),
    }));

    const volumeData = historical.data.map((d) => {
      const up = Number(d.close) >= Number(d.open);
      return {
        time: toTime(d.date),
        value: Number(d.volume) || 0,
        color: up ? COLORS.up : COLORS.down,
      };
    });

    try {
      // set candlestick
      candleRef.current?.setData(candleData);
    } catch (err) {
      try {
        // fallback: line series
        (candleRef.current as any)?.setData?.(
          candleData.map((c) => ({ time: c.time, value: c.close }))
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Failed to set candle/line data", e);
      }
    }

    try {
      volumeRef.current?.setData(volumeData);
    } catch (e) {
      // ignore
    }

    try {
      chartRef.current?.timeScale()?.fitContent();
    } catch {}
  }, [historical]);

  return (
    <div style={{ width: "100%", height: `${height}px` }} ref={containerRef} />
  );
}
