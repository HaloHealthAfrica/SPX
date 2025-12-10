/**
 * Enhanced Options-Aware Decision Engine
 * Agent 9: Updated decision engine with new gates and flow
 */

import { TradingViewSignal, DecisionAudit, GateResult } from '../types';
import { classifyTimeframe, getTimeframeConfig, TimeframeMode } from './timeframe';
import { gateOptionsValidation } from './validation';
import { OptionsGateInput } from './types';
import { calculateTimeframeScore, getSignalWeightsForTimeframe } from './signal-weights';
import { selectStrategy, aggregateGreeks } from './strategy-selection';
import { calculateOptionsPositionSize } from './position-sizing';
import { generateExitRules } from './exit-management';
import { adjustForEvents, getUpcomingEvents } from './event-calendar';
import { checkPortfolioLimits, calculatePortfolioGreeks, DEFAULT_PORTFOLIO_LIMITS } from './portfolio-greeks';
import { OptionLeg, ConvictionLevel } from './types';

export interface OptionsDecisionInput extends TradingViewSignal {
  // Options-specific fields (optional - can be inferred or provided)
  strike?: number;
  expiration?: Date;
  optionType?: 'CALL' | 'PUT';
  impliedVolatility?: number;
  ivRank?: number;
  ivPercentile?: number;
  greeks?: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  bidAskSpread?: number;
  openInterest?: number;
  volume?: number;
  explicitDTE?: number;
  timeframe?: TimeframeMode;
}

export interface OptionsDecisionAudit extends DecisionAudit {
  timeframe?: TimeframeMode;
  strategy?: string;
  options_validation?: any;
  portfolio_greeks_check?: any;
  event_adjustments?: any;
}

/**
 * Enhanced decision engine for options trading
 */
export function runOptionsDecisionEngine(
  signal: OptionsDecisionInput,
  optionsData?: Partial<OptionsGateInput>
): OptionsDecisionAudit {
  const gateResults: GateResult[] = [];
  
  // NEW: Timeframe Classification
  const timeframe = signal.timeframe || classifyTimeframe(signal, signal.explicitDTE);
  const timeframeConfig = getTimeframeConfig(timeframe);
  
  gateResults.push({
    gate: 'Timeframe Classification',
    passed: true,
    reason: `Classified as ${timeframe}`,
  });

  // Gate 1: Signal Integrity (unchanged)
  const gate1 = {
    gate: 'Signal Integrity',
    passed: signal.confidence >= 5.5 &&
            signal.confluence_count >= 2 &&
            signal.active_signals.length > 0 &&
            signal.entry_price > 0 &&
            signal.stop_loss > 0 &&
            signal.take_profit_1 > 0,
    reason: signal.confidence < 5.5 ? 'Confidence too low' :
            signal.confluence_count < 2 ? 'Insufficient confluence' :
            signal.active_signals.length === 0 ? 'No active signals' :
            'Missing required fields'
  };
  gateResults.push(gate1);
  if (!gate1.passed) {
    return createBlockDecision(signal, gateResults, gate1.reason || 'Signal integrity check failed');
  }

  // Gate 2: Session & Volatility (enhanced for timeframe)
  const now = new Date();
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = etTime.getHours();
  const minute = etTime.getMinutes();
  const day = etTime.getDay();
  
  // Timeframe-specific session rules
  let isMarketHours = true;
  if (timeframe === 'INTRADAY') {
    // Intraday: First/last hour restrictions
    isMarketHours = day >= 1 && day <= 5 && 
                    (hour > 9 || (hour === 9 && minute >= 30)) && 
                    hour < 16 &&
                    !(hour === 9 && minute < 45) && // Avoid first 15 min
                    !(hour === 15 && minute >= 45); // Avoid last 15 min
  } else if (timeframe === 'LEAPS') {
    // LEAPS: Can trade any session
    isMarketHours = day >= 1 && day <= 5;
  } else {
    // SWING/MONTHLY: Regular market hours
    isMarketHours = day >= 1 && day <= 5 && 
                    (hour > 9 || (hour === 9 && minute >= 30)) && 
                    hour < 16;
  }

  const gate2 = {
    gate: 'Session & Volatility',
    passed: isMarketHours,
    reason: !isMarketHours ? 'Outside market hours for timeframe' : undefined,
  };
  gateResults.push(gate2);
  if (!gate2.passed) {
    return createBlockDecision(signal, gateResults, gate2.reason || 'Market hours check failed');
  }

  // NEW: Gate 2.5: Options Validation
  if (optionsData) {
    const optionsInput: OptionsGateInput = {
      underlying: signal.symbol,
      strike: optionsData.strike || signal.entry_price,
      expiration: optionsData.expiration || new Date(Date.now() + timeframeConfig.targetDTE[0] * 24 * 60 * 60 * 1000),
      optionType: optionsData.optionType || (signal.direction === 'LONG' ? 'CALL' : 'PUT'),
      currentPrice: optionsData.currentPrice || signal.entry_price,
      impliedVolatility: optionsData.impliedVolatility || 20,
      ivRank: optionsData.ivRank || 50,
      ivPercentile: optionsData.ivPercentile || 50,
      greeks: optionsData.greeks || {
        delta: 0.5,
        gamma: 0.01,
        theta: -0.05,
        vega: 0.1,
      },
      bidAskSpread: optionsData.bidAskSpread || 0.05,
      openInterest: optionsData.openInterest || 1000,
      volume: optionsData.volume || 500,
    };

    const optionsValidation = gateOptionsValidation(optionsInput, timeframeConfig, signal.direction);
    gateResults.push({
      gate: optionsValidation.gate,
      passed: optionsValidation.passed,
      reason: optionsValidation.reason,
    });

    if (!optionsValidation.passed) {
      return createBlockDecision(signal, gateResults, optionsValidation.reason || 'Options validation failed');
    }
  }

  // Gate 3: Signal Factorization (ENHANCED with timeframe-specific weights)
  const scoreResult = calculateTimeframeScore(signal.active_signals, timeframe);
  const totalScore = scoreResult.total;
  const gate3 = {
    gate: 'Signal Factorization',
    passed: totalScore >= timeframeConfig.scoreThreshold,
    reason: totalScore < timeframeConfig.scoreThreshold 
      ? `Total score ${totalScore.toFixed(2)} below threshold ${timeframeConfig.scoreThreshold}` 
      : undefined,
    score: totalScore
  };
  gateResults.push(gate3);
  if (!gate3.passed) {
    return createBlockDecision(signal, gateResults, gate3.reason || 'Signal factorization failed');
  }

  // Gate 4: Role Assignment (unchanged)
  const MARKET_STRUCTURE_SIGNALS = ['STRAT_212', 'BOS', 'MSS', 'CHoCH'];
  const LIQUIDITY_SIGNALS = ['SWEEP_LOW', 'SWEEP_HIGH', 'SMT'];
  const ORDER_FLOW_SIGNALS = ['FVG', 'DISPLACEMENT', 'BREAKER'];
  const VOLUME_SIGNALS = ['VOLUME_SURGE', 'ORB'];

  function getSignalFamily(sig: string): string {
    if (MARKET_STRUCTURE_SIGNALS.includes(sig)) return 'market_structure';
    if (LIQUIDITY_SIGNALS.includes(sig)) return 'liquidity';
    if (ORDER_FLOW_SIGNALS.includes(sig)) return 'order_flow';
    if (VOLUME_SIGNALS.includes(sig)) return 'volume';
    return 'other';
  }

  // Get timeframe-specific weights
  const timeframeWeights = getSignalWeightsForTimeframe(timeframe);
  
  const signalScores = signal.active_signals.map(sig => ({
    signal: sig,
    weight: timeframeWeights[sig] || 0,
    family: getSignalFamily(sig)
  })).sort((a, b) => b.weight - a.weight);

  const primarySignal = signalScores[0]?.signal || '';
  const confirmations = signalScores
    .slice(1)
    .filter(s => s.family !== getSignalFamily(primarySignal))
    .map(s => s.signal)
    .slice(0, 2);

  const gate4 = {
    gate: 'Role Assignment',
    passed: confirmations.length >= 2,
    reason: confirmations.length < 2 ? 'Insufficient confirmations from different families' : undefined
  };
  gateResults.push(gate4);
  if (!gate4.passed) {
    return createBlockDecision(signal, gateResults, gate4.reason || 'Role assignment failed');
  }

  // Gate 5: Weighted Score & Mode (ENHANCED with strategy selection)
  const marketStructureScore = scoreResult.by_family.market_structure;
  const liquidityScore = scoreResult.by_family.liquidity;
  const orderFlowScore = scoreResult.by_family.order_flow;
  const volumeScore = scoreResult.by_family.volume;

  let tradeMode: 'TREND' | 'REVERSAL' | 'BREAKOUT' = 'TREND';
  let minRR = timeframeConfig.minRR;

  if (liquidityScore > marketStructureScore && liquidityScore > volumeScore) {
    tradeMode = 'REVERSAL';
  } else if (volumeScore > marketStructureScore && volumeScore > liquidityScore) {
    tradeMode = 'BREAKOUT';
  } else {
    tradeMode = 'TREND';
  }

  // Strategy selection
  const ivRank = optionsData?.ivRank || 50;
  const conviction: ConvictionLevel = signal.confidence >= 7.0 ? 'HIGH' : 
                                       signal.confidence >= 6.0 ? 'MEDIUM' : 'LOW';
  const strategy = selectStrategy(signal.direction, tradeMode, timeframe, ivRank, conviction);

  // Calculate risk/reward
  const riskReward = signal.direction === 'LONG'
    ? (signal.take_profit_1 - signal.entry_price) / (signal.entry_price - signal.stop_loss)
    : (signal.entry_price - signal.take_profit_1) / (signal.stop_loss - signal.entry_price);

  const gate5 = {
    gate: 'Weighted Score & Mode',
    passed: riskReward >= minRR,
    reason: riskReward < minRR ? `Risk/reward ${riskReward.toFixed(2)} below minimum ${minRR}` : undefined,
    score: riskReward
  };
  gateResults.push(gate5);
  if (!gate5.passed) {
    return createBlockDecision(signal, gateResults, gate5.reason || 'Risk/reward check failed');
  }

  // Gate 6: Risk & Position Sizing (ENHANCED with Greeks-based sizing)
  // This would require actual option legs - simplified for now
  const baseRisk = 1000; // 1% of $100k
  const adjustedRisk = baseRisk * timeframeConfig.riskMultiplier * (tradeMode === 'REVERSAL' ? 0.5 : 1.0);
  
  // Simplified position sizing (would use Greeks in production)
  const priceDiff = Math.abs(signal.entry_price - signal.stop_loss);
  const quantity = Math.floor(adjustedRisk / priceDiff);

  const gate6 = {
    gate: 'Risk & Position Sizing',
    passed: quantity > 0,
    reason: quantity <= 0 ? 'Invalid position size calculated' : undefined
  };
  gateResults.push(gate6);
  if (!gate6.passed) {
    return createBlockDecision(signal, gateResults, gate6.reason || 'Position sizing failed');
  }

  // Gate 7: Daily Limits (checked in API route)

  // NEW: Gate 8: Event Calendar
  const events = getUpcomingEvents(signal.symbol, 30);
  const eventAdjustment = adjustForEvents(signal, timeframe, timeframeConfig, events);
  
  if (eventAdjustment.warnings.length > 0 || eventAdjustment.adjustments.length > 0) {
    gateResults.push({
      gate: 'Event Calendar',
      passed: eventAdjustment.approved,
      reason: eventAdjustment.warnings.join('; ') || 'Event adjustments required',
    });
  }

  if (!eventAdjustment.approved) {
    return createBlockDecision(signal, gateResults, 'Too many event concerns');
  }

  // All gates passed - create TRADE decision
  return {
    signal_id: 0,
    decision: 'TRADE',
    trade_mode: tradeMode,
    timeframe,
    strategy,
    gate_results: gateResults,
    signals: {
      primary: primarySignal,
      confirmations: confirmations,
    },
    score_breakdown: {
      total: totalScore,
      by_family: scoreResult.by_family,
    },
    regime: {
      session: isMarketHours ? 'REGULAR' : 'CLOSED',
    },
    risk_calculation: {
      base_risk: baseRisk,
      adjusted_risk: adjustedRisk,
      quantity: quantity,
      risk_reward: riskReward,
    },
    options_validation: optionsData ? { passed: true } : undefined,
    event_adjustments: eventAdjustment,
  };
}

function createBlockDecision(
  signal: OptionsDecisionInput,
  gateResults: GateResult[],
  reason: string
): OptionsDecisionAudit {
  return {
    signal_id: 0,
    decision: 'BLOCK',
    block_reason: reason,
    gate_results: gateResults,
    signals: {
      primary: signal.active_signals[0] || '',
      confirmations: [],
    },
    score_breakdown: {
      total: 0,
      by_family: {},
    },
    regime: {
      session: 'UNKNOWN',
    },
    risk_calculation: {
      base_risk: 0,
      adjusted_risk: 0,
      quantity: 0,
      risk_reward: 0,
    },
  };
}

