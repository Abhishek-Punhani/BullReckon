import axios from 'axios';
import { API_CONFIG } from '@/lib/config';

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
}

export interface PriceSubscriber {
  id: string;
  symbols: string[];
  callback: (prices: Record<string, PriceData>) => void;
}

class CentralPriceService {
  private static instance: CentralPriceService;
  private subscribers = new Map<string, PriceSubscriber>();
  private priceCache = new Map<string, PriceData>();
  private isPolling = false;
  private abortController: AbortController | null = null;
  private lastUpdateTime = 0;
  private pollTimeout: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private maxRetries = 3;

  // Configuration
  private readonly POLL_INTERVAL = 2000*5; // 10 seconds
  private readonly RETRY_DELAY_BASE = 1000; // 1 second base delay
  private readonly MAX_RETRY_DELAY = 1000*15; // 15 seconds max delay

  private constructor() {
    // Singleton pattern
  }

  public static getInstance(): CentralPriceService {
    if (!CentralPriceService.instance) {
      CentralPriceService.instance = new CentralPriceService();
    }
    return CentralPriceService.instance;
  }

  /**
   * Subscribe to price updates for specific symbols
   */
  subscribe(subscriberId: string, symbols: string[], callback: (prices: Record<string, PriceData>) => void): void {
    console.log(`📊 Subscriber ${subscriberId} subscribing to: ${symbols.join(', ')}`);
    
    this.subscribers.set(subscriberId, {
      id: subscriberId,
      symbols: [...new Set(symbols)], // Remove duplicates
      callback,
    });

    // Send current cached prices immediately
    this.sendCachedPrices(subscriberId);

    // Start polling if not already running
    if (!this.isPolling) {
      this.startPolling();
    }
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribe(subscriberId: string): void {
    console.log(`📊 Subscriber ${subscriberId} unsubscribing`);
    this.subscribers.delete(subscriberId);

    // Stop polling if no subscribers
    if (this.subscribers.size === 0) {
      this.stopPolling();
    }
  }

  /**
   * Update subscription symbols
   */
  updateSubscription(subscriberId: string, symbols: string[]): void {
    const subscriber = this.subscribers.get(subscriberId);
    if (subscriber) {
      subscriber.symbols = [...new Set(symbols)];
      console.log(`📊 Updated ${subscriberId} symbols: ${symbols.join(', ')}`);
      
      // Send current cached prices for new symbols
      this.sendCachedPrices(subscriberId);
    }
  }

  /**
   * Get current cached price for a symbol
   */
  getCurrentPrice(symbol: string): PriceData | null {
    return this.priceCache.get(symbol) || null;
  }

  /**
   * Get all current cached prices
   */
  getAllCurrentPrices(): Record<string, PriceData> {
    const prices: Record<string, PriceData> = {};
    this.priceCache.forEach((priceData, symbol) => {
      prices[symbol] = priceData;
    });
    return prices;
  }

  /**
   * Start the long polling process
   */
  private async startPolling(): Promise<void> {
    if (this.isPolling) return;
    
    this.isPolling = true;
    console.log('🔄 Starting central price polling');
    
    await this.pollPrices();
  }

  /**
   * Stop the polling process
   */
  private stopPolling(): void {
    this.isPolling = false;
    console.log('⏹️ Stopping central price polling');

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
  }

  /**
   * Long polling implementation
   */
  private async pollPrices(): Promise<void> {
    if (!this.isPolling) return;

    try {
      const activeSymbols = this.getActiveSymbols();
      
      if (activeSymbols.length === 0) {
        // No symbols to poll, check again later
        this.schedulePoll(5000);
        return;
      }

      // Create new abort controller for this request
      this.abortController = new AbortController();

      const token = localStorage.getItem('access_token');
      if (!token) {
        console.warn('📊 No auth token, retrying in 5 seconds');
        this.schedulePoll(5000);
        return;
      }

      console.log(`📊 Polling prices for ${activeSymbols.length} symbols:`, activeSymbols, `lastUpdate: ${this.lastUpdateTime}`);

      const response = await axios.get(`${API_CONFIG.MARKET_SERVER}/api/market/long-poll/prices`, {
        params: {
          symbols: activeSymbols.join(','),
          lastUpdate: this.lastUpdateTime,
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: this.abortController.signal,
        timeout: 35000, // 35 seconds
      });

      if (response.data.success) {
        const { data: newPrices, timestamp, hasUpdates } = response.data;
        
        console.log(`📊 Polling response - hasUpdates: ${hasUpdates}, timestamp: ${timestamp}`);
        
        if (hasUpdates && newPrices) {
          this.updatePriceCache(newPrices);
          this.notifySubscribers();
          this.lastUpdateTime = timestamp;
          console.log(`📊 Updated ${Object.keys(newPrices).length} prices at ${new Date(timestamp).toISOString()}`);
        } else {
          console.log(`📊 No price updates, keeping cache. Next poll in ${this.POLL_INTERVAL}ms`);
        }

        this.retryCount = 0; // Reset retry count on success
        
        // Use configured polling interval
        console.log(`📊 Scheduling next poll in ${this.POLL_INTERVAL}ms`);
        this.schedulePoll(this.POLL_INTERVAL);
        
      } else {
        console.warn('📊 Price polling failed:', response.data.message);
        this.handlePollingError(new Error(response.data.message || 'Unknown error'));
      }

    } catch (error: any) {
      if (error.name === 'AbortError' || error.code === 'ABORT_ERR') {
        // Request was cancelled, this is normal
        return;
      }

      console.error('📊 Price polling error:', error);
      this.handlePollingError(error);
    }
  }

  /**
   * Handle polling errors with exponential backoff
   */
  private handlePollingError(error: Error): void {
    this.retryCount++;
    
    if (this.retryCount <= this.maxRetries) {
      const delay = Math.min(
        this.RETRY_DELAY_BASE * Math.pow(2, this.retryCount - 1),
        this.MAX_RETRY_DELAY
      );
      
      console.log(`📊 Retrying in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
      this.schedulePoll(delay);
    } else {
      // Max retries reached, use regular interval
      console.log('📊 Max retries reached, falling back to regular polling');
      this.retryCount = 0;
      this.schedulePoll(this.POLL_INTERVAL * 5); // 10 seconds fallback
    }
  }

  /**
   * Schedule next poll
   */
  private schedulePoll(delay: number): void {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
    }

    this.pollTimeout = setTimeout(() => {
      if (this.isPolling) {
        this.pollPrices();
      }
    }, delay);
  }

  /**
   * Get all unique symbols from all subscribers
   */
  private getActiveSymbols(): string[] {
    const symbolSet = new Set<string>();
    
    this.subscribers.forEach(subscriber => {
      subscriber.symbols.forEach(symbol => symbolSet.add(symbol));
    });
    
    return Array.from(symbolSet);
  }

  /**
   * Update the price cache with new data
   */
  private updatePriceCache(newPrices: Record<string, any>): void {
    Object.entries(newPrices).forEach(([symbol, priceData]) => {
      this.priceCache.set(symbol, {
        symbol,
        price: priceData.price,
        change: priceData.change,
        changePercent: priceData.changePercent,
        timestamp: priceData.timestamp || Date.now(),
        volume: priceData.volume,
        high: priceData.high,
        low: priceData.low,
        open: priceData.open,
      });
    });
  }

  /**
   * Notify all subscribers with relevant price updates
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(subscriber => {
      this.sendCachedPrices(subscriber.id);
    });
  }

  /**
   * Send cached prices to a specific subscriber
   */
  private sendCachedPrices(subscriberId: string): void {
    const subscriber = this.subscribers.get(subscriberId);
    if (!subscriber) return;

    const relevantPrices: Record<string, PriceData> = {};
    
    subscriber.symbols.forEach(symbol => {
      const priceData = this.priceCache.get(symbol);
      if (priceData) {
        relevantPrices[symbol] = priceData;
      }
    });

    if (Object.keys(relevantPrices).length > 0) {
      try {
        subscriber.callback(relevantPrices);
      } catch (error) {
        console.error(`📊 Error notifying subscriber ${subscriberId}:`, error);
      }
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isPolling: this.isPolling,
      subscriberCount: this.subscribers.size,
      activeSymbols: this.getActiveSymbols(),
      cacheSize: this.priceCache.size,
      lastUpdate: this.lastUpdateTime,
      retryCount: this.retryCount,
    };
  }

  /**
   * Force refresh prices
   */
  async forceRefresh(): Promise<void> {
    this.lastUpdateTime = 0; // Reset to force update
    if (this.isPolling) {
      await this.pollPrices();
    }
  }

  /**
   * Cleanup (for app shutdown)
   */
  destroy(): void {
    this.stopPolling();
    this.subscribers.clear();
    this.priceCache.clear();
  }
}

// Export singleton instance
export const centralPriceService = CentralPriceService.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    centralPriceService.destroy();
  });
}