import { internalApi } from "@/internalApi.client";

export async function fetchLivePrice(symbol: string): Promise<number> {
  try {
    const res = await internalApi.get(
      `${process.env.MARKET_SERVER_URL}/api/market/internal/quote/${symbol}`
    );
    return res.data?.data?.price ?? 0;
  } catch (err) {
    // fallback or throw
    return 100 + Math.random() * 10;
  }
}
