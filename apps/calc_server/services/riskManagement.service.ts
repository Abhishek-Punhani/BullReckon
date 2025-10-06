import { Portfolio, IPortfolio } from "../models/portfolio";
import { IRiskSettings, RiskSettings } from "../models/risk_settings";
import { Trade } from "../models/trade";
import { PortfolioSnapshot } from "../models/portfolioSnapshot";
import { RiskAction } from "../models/riskAction";
import { fetchLivePrice } from "../utils/fetchPrice";
import { addCalcEmailJob } from "../queue.setup";
import { riskAlertEmail } from "../emails/riskAlertEmail";
import { getUserEmail } from "../utils/userResolver";
import mongoose from "mongoose";

export interface RiskCalculation {
  currentDrawdown: number;
  maxDrawdownDollar: number;
  positionSizeDollar: number;
  riskScore: number;
  dailyLoss: number;
  isRiskLimitExceeded: boolean;
  riskViolations: string[];
}

export interface PositionRisk {
  symbol: string;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  riskAmount: number;
  isAtRisk: boolean;
}

export class RiskManagementService {
  private queueManager?: any;
  private tradeExecutionQueue?: any;
  private positionMonitoringQueue?: any;
  private positionLocks: Map<string, boolean> = new Map(); // Prevent duplicate executions
  private lastMonitorTime: Map<string, number> = new Map(); // Track monitoring frequency

  constructor() {
    this.queueManager = (global as any).queueManager;
    if (this.queueManager?.isQueueReady()) {
      // Register and store queues
      this.tradeExecutionQueue = this.queueManager.registerQueue(
        "trade-execution",
        {
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
          },
        }
      );

      this.positionMonitoringQueue = this.queueManager.registerQueue(
        "position-monitoring",
        {
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
          },
        }
      );
    }
  }

  /**
   * Validate trade against risk settings before execution
   */
  async validateTradeRisk(
    userId: string,
    symbol: string,
    action: "BUY" | "SELL",
    quantity: number,
    price: number
  ): Promise<{ allowed: boolean; violations: string[] }> {
    const violations: string[] = [];
    const [portfolio, riskSettings, metrics] = await Promise.all([
      Portfolio.findOne({ userId }),
      this.getRiskSettings(userId),
      this.calculateRiskMetrics(userId),
    ]);

    if (!portfolio || !riskSettings) {
      return {
        allowed: false,
        violations: ["Portfolio or risk settings not found"],
      };
    }

    // If risk monitoring is disabled, allow all trades
    if (!riskSettings.enabled) {
      return {
        allowed: true,
        violations: [],
      };
    }

    // Check if risk limits are already exceeded
    if (metrics.isRiskLimitExceeded) {
      violations.push(...metrics.riskViolations);
      return { allowed: false, violations };
    }

    if (action === "BUY") {
      const tradeValue = quantity * price;
      const fees = tradeValue * 0.001;
      const totalCost = tradeValue + fees;

      // Check cash availability
      if (portfolio.cash < totalCost) {
        violations.push(
          `Insufficient cash. Available: $${portfolio.cash.toFixed(2)}, Required: $${totalCost.toFixed(2)}`
        );
      }

      // Check position sizing
      const portfolioValue =
        await this.calculateCurrentPortfolioValue(portfolio);
      const maxPositionSize =
        (portfolioValue * riskSettings.capitalAllocationPercentage) / 100;

      if (tradeValue > maxPositionSize) {
        violations.push(
          `Position size $${tradeValue.toFixed(2)} exceeds limit $${maxPositionSize.toFixed(2)} (${riskSettings.capitalAllocationPercentage}% of portfolio)`
        );
      }

      // Check max positions limit
      if (portfolio.positions.length >= riskSettings.maxPositionsAllowed) {
        const existingPosition = portfolio.positions.find(
          (p: any) => p.symbol === symbol
        );
        if (!existingPosition) {
          violations.push(
            `Maximum positions (${riskSettings.maxPositionsAllowed}) already held`
          );
        }
      }

      // Check if adding this position would exceed max drawdown potential
      const potentialDrawdown =
        (tradeValue * riskSettings.stopLossPercentage) / 100;
      const currentDrawdownRisk =
        (portfolioValue * metrics.currentDrawdown) / 100;
      const totalDrawdownRisk = currentDrawdownRisk + potentialDrawdown;
      const maxDrawdownDollar =
        (portfolioValue * riskSettings.maxDrawdownPercentage) / 100;

      if (totalDrawdownRisk > maxDrawdownDollar) {
        violations.push(
          `Trade would exceed max drawdown risk. Current: $${currentDrawdownRisk.toFixed(2)}, Additional: $${potentialDrawdown.toFixed(2)}, Max: $${maxDrawdownDollar.toFixed(2)}`
        );
      }
    }

    return { allowed: violations.length === 0, violations };
  }

  // Get or create risk settings for user
  async getRiskSettings(userId: string): Promise<IRiskSettings> {
    let settings = await (RiskSettings as any).findOne({ userId });

    if (!settings) {
      settings = new RiskSettings({
        userId,
        // Default moderate settings will be applied from schema
      });
      await settings.save();
    }

    return settings;
  }

  // Update risk settings
  async updateRiskSettings(
    userId: string,
    updates: Partial<IRiskSettings>
  ): Promise<IRiskSettings> {
    const settings = await RiskSettings.findOneAndUpdate(
      { userId },
      { ...updates, lastUpdated: new Date() },
      { new: true, upsert: true }
    );

    // Manage continuous monitoring based on auto settings and enabled flag
    if (settings) {
      const shouldMonitor =
        settings.enabled &&
        (settings.autoStopLossEnabled || settings.autoTakeProfitEnabled);

      if (shouldMonitor) {
        // Start or restart continuous monitoring
        await this.queuePositionMonitoring(userId);
      } else {
        // Stop monitoring if disabled or both auto features are disabled
        await this.stopPositionMonitoring(userId);
      }
    }

    return settings!;
  }

  // Calculate comprehensive risk metrics
  async calculateRiskMetrics(userId: string): Promise<RiskCalculation> {
    const [portfolio, riskSettings] = await Promise.all([
      Portfolio.findOne({ userId }),
      this.getRiskSettings(userId),
    ]);

    if (!portfolio) {
      throw new Error("Portfolio not found");
    }

    // Get historical peak value for drawdown calculation
    const peakValue = await this.getHistoricalPeak(userId, portfolio);
    const currentValue = await this.calculateCurrentPortfolioValue(portfolio);

    // Calculate current drawdown
    const currentDrawdown =
      peakValue > 0 ? ((peakValue - currentValue) / peakValue) * 100 : 0;

    // Calculate position sizing
    const positionSizeDollar =
      (currentValue * riskSettings.capitalAllocationPercentage) / 100;
    const maxDrawdownDollar =
      (peakValue * riskSettings.maxDrawdownPercentage) / 100;

    // Calculate daily loss
    const dailyLoss = await this.calculateDailyLoss(userId);

    // Check risk violations
    const riskViolations: string[] = [];
    let isRiskLimitExceeded = false;

    if (currentDrawdown > riskSettings.maxDrawdownPercentage) {
      riskViolations.push(
        `Drawdown ${currentDrawdown.toFixed(2)}% exceeds limit ${riskSettings.maxDrawdownPercentage}%`
      );
      isRiskLimitExceeded = true;
    }

    if (
      riskSettings.dailyLossLimit &&
      dailyLoss > riskSettings.dailyLossLimit
    ) {
      riskViolations.push(
        `Daily loss $${dailyLoss.toFixed(2)} exceeds limit $${riskSettings.dailyLossLimit}`
      );
      isRiskLimitExceeded = true;
    }

    // Get risk score
    const riskScore = riskSettings.calculateRiskScore();

    return {
      currentDrawdown,
      maxDrawdownDollar,
      positionSizeDollar,
      riskScore,
      dailyLoss,
      isRiskLimitExceeded,
      riskViolations,
    };
  }

  // Get position-level risk analysis
  async getPositionRisks(userId: string): Promise<PositionRisk[]> {
    const [portfolio, riskSettings] = await Promise.all([
      Portfolio.findOne({ userId }).lean() as Promise<IPortfolio | null>,
      this.getRiskSettings(userId),
    ]);

    if (!portfolio || !portfolio.positions || !portfolio.positions.length) {
      return [];
    }

    const positionRisks: PositionRisk[] = [];

    for (const position of portfolio.positions) {
      const currentPrice = await this.getCurrentMarketPrice(position.symbol);

      const currentValue = position.quantity * currentPrice;
      const unrealizedPnL = currentValue - position.totalInvested;
      const unrealizedPnLPercent =
        (unrealizedPnL / position.totalInvested) * 100;

      // Calculate stop loss and take profit prices
      const stopLossPrice =
        position.avgBuyPrice * (1 - riskSettings.stopLossPercentage / 100);
      const takeProfitPrice =
        position.avgBuyPrice * (1 + riskSettings.takeProfitPercentage / 100);

      // Calculate risk amount
      const riskAmount =
        position.quantity * (position.avgBuyPrice - stopLossPrice);

      // Determine if position is at risk
      const isAtRisk =
        (riskSettings.autoStopLossEnabled &&
          currentPrice <= stopLossPrice * 1.05) || // Within 5% of stop
        unrealizedPnLPercent <= -riskSettings.stopLossPercentage * 0.8; // 80% of stop loss reached

      positionRisks.push({
        symbol: position.symbol,
        currentValue,
        unrealizedPnL,
        unrealizedPnLPercent,
        stopLossPrice,
        takeProfitPrice,
        riskAmount,
        isAtRisk,
      });
    }

    return positionRisks;
  }

  // Monitor positions and execute stop loss/take profit
  async monitorPositions(userId: string): Promise<void> {
    const [portfolio, riskSettings] = await Promise.all([
      Portfolio.findOne({ userId }),
      this.getRiskSettings(userId),
    ]);

    if (!portfolio || !riskSettings) return;

    // Skip monitoring if risk settings are disabled
    if (!riskSettings.enabled) {
      console.log(`⏸️ Risk monitoring disabled for user ${userId}`);
      return;
    }

    // Calculate risk metrics first
    const metrics = await this.calculateRiskMetrics(userId);

    // Send alert if portfolio risk limits are exceeded
    if (metrics.isRiskLimitExceeded && riskSettings.alertsEnabled) {
      // Log risk violation for audit trail
      await this.logRiskAction(
        userId,
        "RISK_VIOLATION",
        "Portfolio risk violation detected",
        undefined,
        undefined,
        undefined,
        metrics.riskViolations
      );

      const userEmail = await getUserEmail(userId);
      if (userEmail) {
        await addCalcEmailJob({
          type: "custom",
          to: userEmail,
          subject: "🚨 Risk Alert: Portfolio Violation",
          customHtml: riskAlertEmail({
            reason: "Portfolio risk violation detected",
            details: metrics.riskViolations.join(", "),
          }),
        });
      }
      console.log(
        `🚨 [Risk Alert] Portfolio violation for user ${userId}:`,
        metrics.riskViolations
      );
    }

    // Monitor each position for stop loss and take profit
    for (const position of portfolio.positions) {
      try {
        const currentPrice = await this.getCurrentMarketPrice(position.symbol);

        // Calculate trigger prices
        const stopLossPrice =
          position.avgBuyPrice * (1 - riskSettings.stopLossPercentage / 100);
        const takeProfitPrice =
          position.avgBuyPrice * (1 + riskSettings.takeProfitPercentage / 100);

        // Calculate trailing stop if enabled
        let effectiveStopLoss = stopLossPrice;
        if (
          riskSettings.trailingStopEnabled &&
          riskSettings.trailingStopPercentage
        ) {
          const trailingStop =
            currentPrice * (1 - riskSettings.trailingStopPercentage / 100);
          effectiveStopLoss = Math.max(stopLossPrice, trailingStop);
        }

        // Execute stop loss
        if (
          riskSettings.autoStopLossEnabled &&
          currentPrice <= effectiveStopLoss
        ) {
          await this.executeSellOrder(
            userId,
            position.symbol,
            position.quantity,
            "STOP_LOSS",
            currentPrice
          );

          // Send email notification
          if (riskSettings.alertsEnabled) {
            const userEmail = await getUserEmail(userId);
            if (userEmail) {
              await addCalcEmailJob({
                type: "custom",
                to: userEmail,
                subject: `🛑 Stop Loss Triggered: ${position.symbol}`,
                customHtml: riskAlertEmail({
                  reason: "Stop loss triggered",
                  details: `Position closed at $${currentPrice.toFixed(2)} (${riskSettings.trailingStopEnabled ? "trailing" : "fixed"} stop loss)`,
                  tradeInfo: {
                    symbol: position.symbol,
                    action: "SELL",
                    quantity: position.quantity,
                    price: currentPrice,
                  },
                }),
              });
            }
          }

          console.log(
            `🛑 Stop loss executed for ${position.symbol} at $${currentPrice}`
          );
        }

        // Execute take profit
        if (
          riskSettings.autoTakeProfitEnabled &&
          currentPrice >= takeProfitPrice
        ) {
          await this.executeSellOrder(
            userId,
            position.symbol,
            position.quantity,
            "TAKE_PROFIT",
            currentPrice
          );

          // Send email notification
          if (riskSettings.alertsEnabled) {
            const profit =
              (currentPrice - position.avgBuyPrice) * position.quantity;
            const userEmail = await getUserEmail(userId);
            if (userEmail) {
              await addCalcEmailJob({
                type: "custom",
                to: userEmail,
                subject: `💰 Take Profit Executed: ${position.symbol}`,
                customHtml: riskAlertEmail({
                  reason: "Take profit target reached",
                  details: `Position closed at $${currentPrice.toFixed(2)} with profit of $${profit.toFixed(2)}`,
                  tradeInfo: {
                    symbol: position.symbol,
                    action: "SELL",
                    quantity: position.quantity,
                    price: currentPrice,
                  },
                }),
              });
            }
          }

          console.log(
            `💰 Take profit executed for ${position.symbol} at $${currentPrice}`
          );
        }
      } catch (error) {
        console.error(`Error monitoring position ${position.symbol}:`, error);
      }
    }
  }

  // Calculate optimal position size based on risk
  async calculateOptimalPositionSize(
    userId: string,
    entryPrice: number,
    stopLossPrice?: number
  ): Promise<{ shares: number; dollarAmount: number; riskAmount: number }> {
    const [portfolio, riskSettings] = await Promise.all([
      Portfolio.findOne({ userId }),
      this.getRiskSettings(userId),
    ]);

    if (!portfolio || !riskSettings) {
      throw new Error("Portfolio or risk settings not found");
    }

    const portfolioValue = await this.calculateCurrentPortfolioValue(portfolio);
    const maxTradeAmount =
      (portfolioValue * riskSettings.capitalAllocationPercentage) / 100;

    let shares: number;
    let dollarAmount: number;
    let riskAmount: number;

    if (riskSettings.positionSizingEnabled && stopLossPrice) {
      // Risk-based position sizing
      const riskPerShare = Math.abs(entryPrice - stopLossPrice);
      const maxRiskAmount =
        (portfolioValue * riskSettings.stopLossPercentage) / 100;

      shares = Math.floor(maxRiskAmount / riskPerShare);
      dollarAmount = shares * entryPrice;
      riskAmount = shares * riskPerShare;

      // Don't exceed capital allocation limit
      if (dollarAmount > maxTradeAmount) {
        shares = Math.floor(maxTradeAmount / entryPrice);
        dollarAmount = shares * entryPrice;
        riskAmount = shares * riskPerShare;
      }
    } else {
      // Fixed allocation position sizing
      dollarAmount = maxTradeAmount;
      shares = Math.floor(dollarAmount / entryPrice);
      riskAmount = stopLossPrice
        ? shares * Math.abs(entryPrice - stopLossPrice)
        : 0;
    }

    return { shares, dollarAmount, riskAmount };
  }

  // Private helper methods
  private async getHistoricalPeak(
    userId: string,
    portfolio: IPortfolio
  ): Promise<number> {
    // Get the highest portfolio value from snapshots
    const peakSnapshot = await PortfolioSnapshot.findOne({
      userId,
      isPeak: true,
    }).sort({ totalValue: -1 });

    if (peakSnapshot) {
      return peakSnapshot.totalValue;
    }

    // If no peak snapshot exists, use current value and create one
    const currentValue = await this.calculateCurrentPortfolioValue(portfolio);
    await this.createPortfolioSnapshot(userId, portfolio, currentValue, true);
    return currentValue;
  }

  private async calculateCurrentPortfolioValue(
    portfolio: IPortfolio
  ): Promise<number> {
    let totalValue = portfolio.cash;

    for (const position of portfolio.positions) {
      const currentPrice = await this.getCurrentMarketPrice(position.symbol);
      totalValue += position.quantity * currentPrice;
    }

    return totalValue;
  }

  private async calculateDailyLoss(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyTrades = await Trade.find({
      userId,
      executedAt: { $gte: today },
      realizedPnL: { $lt: 0 }, // Only losses
    });

    return Math.abs(
      dailyTrades.reduce((sum, trade) => sum + (trade.realizedPnL || 0), 0)
    );
  }

  private async getCurrentMarketPrice(symbol: string): Promise<number> {
    return fetchLivePrice(symbol);
  }

  private async executeSellOrder(
    userId: string,
    symbol: string,
    quantity: number,
    type: "STOP_LOSS" | "TAKE_PROFIT",
    price: number
  ): Promise<void> {
    // Create lock key to prevent duplicate executions
    const lockKey = `${userId}-${symbol}-${type}`;

    // Check if already processing this position
    if (this.positionLocks.get(lockKey)) {
      console.log(
        `⚠️ ${type} already in progress for ${symbol}, skipping duplicate`
      );
      return;
    }

    // Set lock
    this.positionLocks.set(lockKey, true);

    try {
      // Log risk action for audit trail
      const riskAction = await this.logRiskAction(
        userId,
        type,
        `${type === "STOP_LOSS" ? "Stop loss" : "Take profit"} triggered at $${price.toFixed(2)}`,
        symbol,
        quantity,
        price
      );

      if (this.tradeExecutionQueue) {
        await this.tradeExecutionQueue.add("sell-order", {
          tradeId: `${type.toLowerCase()}-${Date.now()}`,
          userId,
          symbol,
          action: "SELL",
          quantity,
          orderType: "market",
          price,
          priority: type === "STOP_LOSS" ? "urgent" : "high",
          reason:
            type === "STOP_LOSS"
              ? "Stop loss triggered"
              : "Take profit target reached",
          riskActionId: riskAction?._id,
        });
        console.log(`✅ Queued ${type} order for ${symbol} at $${price}`);
      } else {
        console.warn(
          `⚠️ Queue not available, ${type} for ${symbol} at $${price} not executed`
        );
        if (riskAction) {
          await this.updateRiskActionStatus(
            riskAction._id,
            "failed",
            undefined,
            "Queue not available"
          );
        }
      }
    } catch (error) {
      console.error(`❌ Error executing ${type} for ${symbol}:`, error);
    } finally {
      // Release lock after 30 seconds
      setTimeout(() => {
        this.positionLocks.delete(lockKey);
      }, 30000);
    }
  }

  private async queuePositionMonitoring(userId: string): Promise<void> {
    // Schedule recurring risk monitoring for the user
    if (this.queueManager?.isQueueReady()) {
      const riskMonitorQueue = this.queueManager.getQueue(
        "risk-settings-monitor"
      );
      if (riskMonitorQueue) {
        // Use a unique jobId to prevent duplicate monitoring jobs
        const jobId = `risk-monitor-${userId}`;

        // Remove any existing recurring job first
        try {
          await riskMonitorQueue.removeRepeatable({
            jobId,
            every: 30000,
          });
        } catch (error) {
          // Job might not exist, ignore error
        }

        // Schedule recurring monitoring every 30 seconds
        await riskMonitorQueue.add(
          "monitor-risk-settings",
          { userId },
          {
            jobId,
            repeat: {
              every: 30000, // 30 seconds
            },
            removeOnComplete: true,
            removeOnFail: false, // Keep failed jobs for debugging
          }
        );
        console.log(
          `📊 Scheduled recurring risk monitoring for user ${userId} (every 30s)`
        );
      }
    }
  }

  /**
   * Stop continuous risk monitoring for a user
   */
  async stopPositionMonitoring(userId: string): Promise<void> {
    if (this.queueManager?.isQueueReady()) {
      const riskMonitorQueue = this.queueManager.getQueue(
        "risk-settings-monitor"
      );
      if (riskMonitorQueue) {
        const jobId = `risk-monitor-${userId}`;
        try {
          await riskMonitorQueue.removeRepeatable({
            jobId,
            every: 30000,
          });
          console.log(`🛑 Stopped risk monitoring for user ${userId}`);
        } catch (error) {
          console.error(
            `Failed to stop risk monitoring for user ${userId}:`,
            error
          );
        }
      }
    }
  }

  /**
   * Create a portfolio snapshot for tracking peak values and history
   */
  private async createPortfolioSnapshot(
    userId: string,
    portfolio: IPortfolio,
    totalValue: number,
    isPeak: boolean = false
  ): Promise<void> {
    try {
      const snapshot = new PortfolioSnapshot({
        userId,
        totalValue,
        cash: portfolio.cash,
        positionsValue: totalValue - portfolio.cash,
        timestamp: new Date(),
        isPeak,
      });
      await snapshot.save();

      // If this is a new peak, unmark old peaks
      if (isPeak) {
        await PortfolioSnapshot.updateMany(
          { userId, _id: { $ne: snapshot._id }, isPeak: true },
          { isPeak: false }
        );
      }
    } catch (error) {
      console.error("Error creating portfolio snapshot:", error);
    }
  }

  /**
   * Log a risk action for audit trail
   */
  private async logRiskAction(
    userId: string,
    action: "STOP_LOSS" | "TAKE_PROFIT" | "RISK_VIOLATION" | "TRADE_BLOCKED",
    reason: string,
    symbol?: string,
    quantity?: number,
    price?: number,
    violations?: string[]
  ): Promise<any> {
    try {
      const riskAction = new RiskAction({
        userId,
        action,
        symbol,
        quantity,
        price,
        reason,
        violations,
        status: "pending",
      });
      await riskAction.save();
      return riskAction;
    } catch (error) {
      console.error("Error logging risk action:", error);
      return null;
    }
  }

  /**
   * Update risk action status
   */
  private async updateRiskActionStatus(
    riskActionId: mongoose.Types.ObjectId,
    status: "executed" | "failed",
    tradeId?: mongoose.Types.ObjectId,
    errorMessage?: string
  ): Promise<void> {
    try {
      await RiskAction.findByIdAndUpdate(riskActionId, {
        status,
        tradeId,
        errorMessage,
        executedAt: status === "executed" ? new Date() : undefined,
      });
    } catch (error) {
      console.error("Error updating risk action status:", error);
    }
  }

  /**
   * Update portfolio snapshot and check for new peak
   */
  async updatePortfolioSnapshot(userId: string): Promise<void> {
    try {
      const portfolio = await Portfolio.findOne({ userId });
      if (!portfolio) return;

      const currentValue = await this.calculateCurrentPortfolioValue(portfolio);
      const peakValue = await this.getHistoricalPeak(userId, portfolio);

      // Check if this is a new peak
      const isPeak = currentValue > peakValue;

      // Create snapshot (daily or on significant changes)
      await this.createPortfolioSnapshot(
        userId,
        portfolio,
        currentValue,
        isPeak
      );
    } catch (error) {
      console.error("Error updating portfolio snapshot:", error);
    }
  }
}
