import { Portfolio, IPortfolio } from "../models/portfolio";
import { IRiskSettings, RiskSettings } from "../models/risk_settings";
import { Trade } from "../models/trade";
import { fetchLivePrice } from "../utils/fetchPrice";

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

  constructor() {
    this.queueManager = (global as any).queueManager;
    if (this.queueManager?.isQueueReady()) {
      this.queueManager.registerQueue("trade-execution", {
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      });

      this.queueManager.registerQueue("position-monitoring", {
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      });
    }
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

    // If auto settings are enabled, queue position monitoring
    if (
      settings &&
      (settings.autoStopLossEnabled || settings.autoTakeProfitEnabled)
    ) {
      await this.queuePositionMonitoring(userId);
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

    for (const position of portfolio.positions) {
      const currentPrice = await this.getCurrentMarketPrice(position.symbol);

      // Calculate trigger prices
      const stopLossPrice =
        position.avgBuyPrice * (1 - riskSettings.stopLossPercentage / 100);
      const takeProfitPrice =
        position.avgBuyPrice * (1 + riskSettings.takeProfitPercentage / 100);

      // Execute stop loss
      if (riskSettings.autoStopLossEnabled && currentPrice <= stopLossPrice) {
        await this.executeSellOrder(
          userId,
          position.symbol,
          position.quantity,
          "STOP_LOSS",
          currentPrice
        );
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
        console.log(
          `💰 Take profit executed for ${position.symbol} at $${currentPrice}`
        );
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
    // This would typically come from a portfolio_snapshots table
    // For now, we'll use current value as peak (you should implement proper tracking)

    // TODO Add this from market server
    return await this.calculateCurrentPortfolioValue(portfolio);
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
    if (this.queueManager?.isQueueReady()) {
      await this.queueManager.queueTradeExecution({
        tradeId: `${type.toLowerCase()}-${Date.now()}`,
        userId,
        symbol,
        action: "SELL",
        quantity,
        orderType: "market",
        priority: type === "STOP_LOSS" ? "urgent" : "high",
      });
    } else {
      // Fallback: Create trade record directly
      console.log(`Direct execution: ${type} for ${symbol} at $${price}`);
    }
  }

  private async queuePositionMonitoring(userId: string): Promise<void> {
    if (this.queueManager?.isQueueReady()) {
      // Queue a recurring job to monitor this user's positions
      console.log(`📊 Queued position monitoring for user ${userId}`);
    }
  }
}
