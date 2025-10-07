import { Request, Response, NextFunction } from "express";
import IORedis from "ioredis";
import crypto from "crypto";

interface CacheOptions {
  ttl?: number;
  keyPrefix?: string;
  includeUser?: boolean;
  includeQuery?: boolean;
  includeBody?: boolean;
  excludeParams?: string[];
}

interface CachedResponse {
  data: any;
  timestamp: number;
  statusCode: number;
}

class CacheManager {
  private redis: IORedis | null = null;
  private isConnected = false;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      if (process.env.DISABLE_REDIS_QUEUES === "true") {
        console.log("⚠️ Redis caching disabled via environment variable");
        return;
      }

      this.redis = new IORedis({
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on("connect", () => {
        console.log("✅ Cache Redis connected successfully");
        this.isConnected = true;
      });

      this.redis.on("error", (err) => {
        console.error("❌ Cache Redis connection error:", err.message);
        this.isConnected = false;
      });

      this.redis.on("close", () => {
        console.log("⚠️ Cache Redis connection closed");
        this.isConnected = false;
      });

      // Test connection
      await this.redis.ping();
    } catch (error) {
      console.error("❌ Failed to initialize cache Redis:", error);
      this.redis = null;
      this.isConnected = false;
    }
  }

  private generateCacheKey(req: Request, options: CacheOptions = {}): string {
    const {
      keyPrefix = "cache",
      includeUser = false,
      includeQuery = true,
      includeBody = false,
      excludeParams = [],
    } = options;

    const parts: string[] = [keyPrefix];

    // Add base path
    parts.push(req.route?.path || req.path);

    // Add method
    parts.push(req.method.toLowerCase());

    // Add user ID if needed
    if (includeUser && req.user?._id) {
      parts.push(`user:${req.user._id}`);
    }

    // Add path parameters
    if (req.params && Object.keys(req.params).length > 0) {
      const paramString = Object.entries(req.params)
        .map(([key, value]) => `${key}:${value}`)
        .join(",");
      parts.push(`params:${paramString}`);
    }

    // Add query parameters
    if (includeQuery && req.query && Object.keys(req.query).length > 0) {
      const filteredQuery = Object.entries(req.query)
        .filter(([key]) => !excludeParams.includes(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join(",");

      if (filteredQuery) {
        parts.push(`query:${filteredQuery}`);
      }
    }

    // Add request body
    if (includeBody && req.body && Object.keys(req.body).length > 0) {
      const bodyHash = crypto
        .createHash("md5")
        .update(JSON.stringify(req.body))
        .digest("hex");
      parts.push(`body:${bodyHash}`);
    }

    return parts.join(":");
  }

  /**
   * Get data from cache
   */
  async get(key: string): Promise<CachedResponse | null> {
    if (!this.redis || !this.isConnected) {
      return null;
    }

    try {
      const cached = await this.redis.get(key);
      if (!cached) {
        return null;
      }

      const parsed: CachedResponse = JSON.parse(cached);
      return parsed;
    } catch (error) {
      console.error("❌ Cache get error:", error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set(
    key: string,
    data: any,
    statusCode: number = 200,
    ttl: number = 300
  ): Promise<void> {
    if (!this.redis || !this.isConnected) {
      return;
    }

    try {
      const cacheData: CachedResponse = {
        data,
        timestamp: Date.now(),
        statusCode,
      };

      await this.redis.setex(key, ttl, JSON.stringify(cacheData));
    } catch (error) {
      console.error("❌ Cache set error:", error);
    }
  }

  /**
   * Delete cache entries by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.redis || !this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.redis.del(...keys);
      console.log(
        ` Deleted ${deleted} cache entries matching pattern: ${pattern}`
      );
      return deleted;
    } catch (error) {
      console.error(" Cache delete pattern error:", error);
      return 0;
    }
  }

  /**
   * Delete specific cache key
   */
  async delete(key: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      const deleted = await this.redis.del(key);
      return deleted > 0;
    } catch (error) {
      console.error("❌ Cache delete error:", error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (!this.redis || !this.isConnected) {
      return;
    }

    try {
      await this.redis.flushdb();
      console.log("🗑️ Cache cleared successfully");
    } catch (error) {
      console.error("❌ Cache clear error:", error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    keyCount: number;
    memoryUsage?: string;
  }> {
    if (!this.redis || !this.isConnected) {
      return {
        connected: false,
        keyCount: 0,
      };
    }

    try {
      const keyCount = await this.redis.dbsize();
      const info = await this.redis.info("memory");
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch?.[1]?.trim();

      return {
        connected: true,
        keyCount,
        memoryUsage,
      };
    } catch (error) {
      console.error("❌ Cache stats error:", error);
      return {
        connected: false,
        keyCount: 0,
      };
    }
  }
}

export const cacheManager = new CacheManager();

export function cacheMiddleware(options: CacheOptions = {}) {
  const defaultTTL = options.ttl || 300;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests unless explicitly enabled
    if (req.method !== "GET") {
      return next();
    }

    const cacheKey = cacheManager["generateCacheKey"](req, options);

    try {
      // Try to get from cache
      const cached = await cacheManager.get(cacheKey);

      if (cached) {
        console.log(`🎯 Cache HIT: ${cacheKey}`);

        // Set cache headers
        res.set({
          "X-Cache": "HIT",
          "X-Cache-Key": cacheKey,
          "X-Cache-Timestamp": new Date(cached.timestamp).toISOString(),
        });

        return res.status(cached.statusCode).json(cached.data);
      }

      console.log(`💨 Cache MISS: ${cacheKey}`);

      // Cache miss - intercept response
      const originalJson = res.json.bind(res);
      let responseSent = false;

      res.json = function (data: any) {
        if (!responseSent) {
          responseSent = true;

          // Cache the response if it's successful
          if (res.statusCode >= 200 && res.statusCode < 300) {
            cacheManager
              .set(cacheKey, data, res.statusCode, defaultTTL)
              .catch((error) =>
                console.error("❌ Failed to cache response:", error)
              );
          }

          // Set cache headers
          res.set({
            "X-Cache": "MISS",
            "X-Cache-Key": cacheKey,
          });
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error("❌ Cache middleware error:", error);
      next();
    }
  };
}

/**
 * Predefined cache middleware configurations
 */
export const portfolioCache = cacheMiddleware({
  keyPrefix: "portfolio",
  ttl: 180, // 3 minutes
  includeUser: true,
  includeQuery: true,
});

export const marketCache = cacheMiddleware({
  keyPrefix: "market",
  ttl: 60, // 1 minute
  includeQuery: true,
  excludeParams: ["timestamp", "_t"], // Exclude timestamp params
});

export const historyCache = cacheMiddleware({
  keyPrefix: "history",
  ttl: 300, // 5 minutes
  includeUser: true,
  includeQuery: true,
});

export const companyCache = cacheMiddleware({
  keyPrefix: "company",
  ttl: 1800, // 30 minutes
  includeQuery: true,
});

/**
 * Clear cache after trade execution
 */
export async function clearTradeRelatedCache(
  userId: string,
  symbol?: string
): Promise<void> {
  try {
    console.log(
      `🧹 Clearing trade-related cache for user ${userId}${symbol ? ` and symbol ${symbol}` : ""}`
    );

    const patterns = [
      `portfolio:*user:${userId}*`, // User's portfolio data
      `history:*user:${userId}*`, // User's trade history
    ];

    // If symbol is provided, also clear market data for that symbol
    if (symbol) {
      patterns.push(`market:*${symbol}*`);
    }

    // Clear all patterns
    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await cacheManager.deletePattern(pattern);
      totalDeleted += deleted;
    }

    console.log(
      `✅ Cleared ${totalDeleted} cache entries after trade execution`
    );
  } catch (error) {
    console.error("❌ Error clearing trade-related cache:", error);
  }
}

/**
 * Clear all market data cache
 */
export async function clearMarketCache(): Promise<void> {
  try {
    console.log("🧹 Clearing all market cache");
    const deleted = await cacheManager.deletePattern("market:*");
    console.log(`✅ Cleared ${deleted} market cache entries`);
  } catch (error) {
    console.error("❌ Error clearing market cache:", error);
  }
}

export async function clearUserCache(userId: string): Promise<void> {
  try {
    console.log(`🧹 Clearing cache for user ${userId}`);
    const patterns = [`portfolio:*user:${userId}*`, `history:*user:${userId}*`];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await cacheManager.deletePattern(pattern);
      totalDeleted += deleted;
    }

    console.log(`✅ Cleared ${totalDeleted} cache entries for user ${userId}`);
  } catch (error) {
    console.error("❌ Error clearing user cache:", error);
  }
}

export default cacheMiddleware;
