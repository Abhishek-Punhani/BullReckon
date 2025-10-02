import { internalApi } from "@/internalApi.client";

export async function fetchLivePrice(symbol: string): Promise<number> {
  try {
    const res = await internalApi.get(
      `${process.env.MARKET_SERVER_URL}/api/market/internal/quote/${symbol}`
    );
    console.log(`Fetched live price for ${symbol}:`, res.data);
    return res.data?.data?.price ?? 0;
  } catch (err) {
    throw new Error(`Failed to fetch live price for ${symbol}: ${err}`);
  }
}

export const fetchMultiplePrices = async (
  symbols: string[]
): Promise<Record<string, number>> => {
  if (symbols.length === 0) return {};

  try {
    const pricePromises = symbols.map(async (symbol) => {
      const price = await fetchLivePrice(symbol);
      return { symbol, price };
    });

    const prices = await Promise.all(pricePromises);
    return prices.reduce(
      (acc, { symbol, price }) => {
        if (price > 0) acc[symbol] = price;
        return acc;
      },
      {} as Record<string, number>
    );
  } catch (error) {
    console.warn("Failed to fetch multiple prices:", error);
    return {};
  }
};
