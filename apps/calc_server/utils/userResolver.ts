import { internalApi } from "../../../shared/internalApi.client";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const emailCache = new Map<string, { email: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Resolve user email from userId with caching
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    // Check cache first
    const cached = emailCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.email;
    }

    // Fetch from auth server
    const response = await internalApi.get(
      `${process.env.AUTH_SERVER_URL}/api/internal/get-user-email/${userId}`
    );
    const email = response.data.email;

    if (email) {
      // Cache the result
      emailCache.set(userId, { email, timestamp: Date.now() });
      return email;
    }

    return null;
  } catch (error) {
    console.error(`Failed to resolve email for user ${userId}:`, error);
    return null;
  }
}

/**
 * Clear email cache for a specific user
 */
export function clearEmailCache(userId: string): void {
  emailCache.delete(userId);
}

/**
 * Clear all email cache
 */
export function clearAllEmailCache(): void {
  emailCache.clear();
}
