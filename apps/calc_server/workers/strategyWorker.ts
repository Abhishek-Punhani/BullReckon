import { Job } from "bullmq";
import { Strategy, IRule, ICondition, IAction } from "../models";
import { fetchLivePrice } from "../utils/fetchPrice";
import mongoose from "mongoose";

export interface StrategyExecutionJobData {
  strategyId: string;
  userId: string;
  symbol?: string; // Optional - if provided, only execute rules for this symbol
  triggerType: "manual" | "scheduled" | "market_trigger";
  dryRun?: boolean;
  metadata?: {
    triggeredBy?: string;
    marketCondition?: string;
    [key: string]: any;
  };
}

export interface StrategyExecutionResult {
  strategyId: string;
  executionsPerformed: number;
  executions: Array<{
    ruleId: string;
    ruleName?: string;
    symbol: string;
    action: "BUY" | "SELL" | "HOLD";
    quantity: number;
    price: number;
    confidence: number;
    reason: string;
    status: "pending" | "executed" | "failed" | "cancelled" | "simulated";
  }>;
  activeRulesCount: number;
  processingTime: number;
  success: boolean;
  error?: string;
}

/**
 * Strategy Execution Worker
 *
 * Processes strategy execution jobs in the background.
 * This allows for:
 * - Asynchronous strategy execution
 * - Rate limiting of strategy executions
 * - Retry logic for failed executions
 * - Monitoring and logging of strategy performance
 */
export async function processStrategyExecutionJob(
  job: Job<StrategyExecutionJobData>
): Promise<StrategyExecutionResult> {
  const startTime = Date.now();
  const {
    strategyId,
    userId,
    symbol,
    triggerType,
    dryRun = false,
    metadata,
  } = job.data;

  console.log(
    `🔄 [Strategy Worker] Processing strategy execution job ${job.id} for strategy ${strategyId}`
  );

  try {
    // Validate strategy ID
    if (!mongoose.Types.ObjectId.isValid(strategyId)) {
      throw new Error(`Invalid strategy ID: ${strategyId}`);
    }

    // Find the strategy
    const strategy = await Strategy.findOne({
      _id: strategyId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyId}`);
    }

    // Check if strategy is active (unless it's a manual execution)
    if (triggerType !== "manual" && strategy.status !== "active") {
      throw new Error(
        `Strategy ${strategyId} is not active (status: ${strategy.status})`
      );
    }

    // Get active rules
    const activeRules = strategy.activeRules;
    if (activeRules.length === 0) {
      console.log(
        `⚠️ [Strategy Worker] No active rules for strategy ${strategyId}`
      );
      return {
        strategyId,
        executionsPerformed: 0,
        executions: [],
        activeRulesCount: 0,
        processingTime: Date.now() - startTime,
        success: true,
      };
    }

    const executions: StrategyExecutionResult["executions"] = [];
    let currentPrices: Record<string, number> = {};

    // Filter rules by symbol if specified
    const rulesToProcess = symbol
      ? activeRules.filter(
          (rule) => rule.condition.symbol.toUpperCase() === symbol.toUpperCase()
        )
      : activeRules;

    console.log(
      `📊 [Strategy Worker] Processing ${rulesToProcess.length} rules for strategy ${strategyId}`
    );

    // Process each rule
    for (const rule of rulesToProcess) {
      try {
        // Check if rule can execute (cooldown)
        if (!strategy.canRuleExecute(rule.id)) {
          console.log(
            `⏳ [Strategy Worker] Rule ${rule.id} is in cooldown, skipping`
          );
          continue;
        }

        const ruleSymbol = rule.condition.symbol.toUpperCase();

        // Get current price for this symbol if not already fetched
        if (!currentPrices[ruleSymbol]) {
          try {
            currentPrices[ruleSymbol] = await fetchLivePrice(ruleSymbol);
          } catch (priceError) {
            console.error(
              `❌ [Strategy Worker] Failed to fetch price for ${ruleSymbol}:`,
              priceError
            );
            continue; // Skip this rule if we can't get the price
          }
        }

        // Evaluate rule condition (simplified for now)
        // In a real implementation, this would use proper technical analysis
        const conditionMet = await evaluateRuleCondition(
          rule,
          currentPrices[ruleSymbol]
        );

        if (conditionMet) {
          const execution = {
            ruleId: rule.id,
            ruleName: rule.name || `Rule ${rule.id}`,
            symbol: ruleSymbol,
            action: rule.action.type,
            quantity: rule.action.quantity,
            price: currentPrices[ruleSymbol],
            confidence: calculateConfidence(rule, currentPrices[ruleSymbol]),
            reason: generateExecutionReason(rule, triggerType, metadata),
            status: (dryRun ? "simulated" : "pending") as
              | "pending"
              | "executed"
              | "failed"
              | "cancelled"
              | "simulated",
          };

          executions.push(execution);

          // Add to execution logs if not dry run
          if (!dryRun) {
            strategy.addExecutionLog({
              ruleId: execution.ruleId,
              ruleName: execution.ruleName,
              symbol: execution.symbol,
              action: execution.action,
              quantity: execution.quantity,
              price: execution.price,
              confidence: execution.confidence,
              reason: execution.reason,
              status: "pending" as const,
              tradeId: undefined,
              profit: undefined,
              errorMessage: undefined,
            });

            // Update rule's last executed time
            const ruleIndex = strategy.rules.findIndex((r) => r.id === rule.id);
            if (ruleIndex !== -1 && strategy.rules[ruleIndex]) {
              strategy.rules[ruleIndex].lastExecuted = new Date();
            }
          }

          console.log(
            `✅ [Strategy Worker] Rule ${rule.id} executed for ${ruleSymbol} at ${currentPrices[ruleSymbol]}`
          );
        } else {
          console.log(
            `📉 [Strategy Worker] Rule ${rule.id} condition not met for ${ruleSymbol}`
          );
        }
      } catch (ruleError) {
        console.error(
          `❌ [Strategy Worker] Error processing rule ${rule.id}:`,
          ruleError
        );
        // Continue with other rules
      }
    }

    // Save strategy if executions were performed and not dry run
    if (!dryRun && executions.length > 0) {
      strategy.lastExecuted = new Date();
      await strategy.save();
    }

    const result: StrategyExecutionResult = {
      strategyId,
      executionsPerformed: executions.length,
      executions,
      activeRulesCount: activeRules.length,
      processingTime: Date.now() - startTime,
      success: true,
    };

    console.log(
      `✅ [Strategy Worker] Completed strategy execution job ${job.id}: ${executions.length} executions`
    );
    return result;
  } catch (error) {
    console.error(
      `❌ [Strategy Worker] Strategy execution job ${job.id} failed:`,
      error
    );

    return {
      strategyId,
      executionsPerformed: 0,
      executions: [],
      activeRulesCount: 0,
      processingTime: Date.now() - startTime,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Evaluate if a rule's condition is met
 * This is a simplified implementation - in production, this would use real technical analysis
 */
async function evaluateRuleCondition(
  rule: IRule,
  currentPrice: number
): Promise<boolean> {
  const { condition } = rule;

  // Simplified condition evaluation based on indicator and operator
  switch (condition.indicator) {
    case "price":
      return evaluatePriceCondition(condition, currentPrice);

    case "rsi":
    case "ema":
    case "sma":
    case "macd":
    case "bollinger":
    case "volume":
    case "stochastic":
      // For demo purposes, return a random result
      // In production, these would calculate actual technical indicators
      return Math.random() > 0.7; // 30% chance of condition being met

    default:
      console.warn(
        `⚠️ [Strategy Worker] Unknown indicator: ${condition.indicator}`
      );
      return false;
  }
}

/**
 * Evaluate price-based conditions
 */
function evaluatePriceCondition(
  condition: ICondition,
  currentPrice: number
): boolean {
  const { operator, value, secondValue } = condition;

  switch (operator) {
    case "greater_than":
      return currentPrice > value;
    case "less_than":
      return currentPrice < value;
    case "equal_to":
      return Math.abs(currentPrice - value) < 0.01; // Allow small tolerance
    case "greater_equal":
      return currentPrice >= value;
    case "less_equal":
      return currentPrice <= value;
    case "crosses_above":
    case "crosses_below":
      // These would require historical data to determine crossing
      // For now, just check if price is above/below the value
      return operator === "crosses_above"
        ? currentPrice > value
        : currentPrice < value;
    default:
      return false;
  }
}

/**
 * Calculate confidence score for the execution
 */
function calculateConfidence(rule: IRule, currentPrice: number): number {
  // Simplified confidence calculation
  // In production, this would consider market volatility, volume, etc.
  const baseConfidence = 70;
  const priceVariation = Math.random() * 20; // 0-20% variation

  return Math.min(100, Math.max(50, baseConfidence + priceVariation));
}

/**
 * Generate execution reason text
 */
function generateExecutionReason(
  rule: IRule,
  triggerType: string,
  metadata?: any
): string {
  const { condition } = rule;
  let reason = `${condition.indicator.toUpperCase()} ${condition.operator.replace("_", " ")} ${condition.value}`;

  if (triggerType === "scheduled") {
    reason += " (scheduled execution)";
  } else if (triggerType === "market_trigger") {
    reason += " (market trigger)";
  } else if (triggerType === "manual") {
    reason += " (manual execution)";
  }

  if (metadata?.marketCondition) {
    reason += ` - Market: ${metadata.marketCondition}`;
  }

  return reason;
}
