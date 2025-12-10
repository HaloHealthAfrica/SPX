import { TradingViewSignal, DecisionAudit, GateResult } from './types';

const SIGNAL_WEIGHTS: Record<string, number> = {
  // Market Structure
  STRAT_212: 2.5,
  BOS: 2.5,
  MSS: 2.5,
  CHoCH: 2.5,
  // Liquidity Events
  SWEEP_LOW: 2.0,
  SWEEP_HIGH: 2.0,
  SMT: 2.0,
  // Order Flow
  FVG: 3.0,
  DISPLACEMENT: 3.0,
  BREAKER: 3.0,
  // Volume/Momentum
  VOLUME_SURGE: 2.0,
  ORB: 2.0,
};

const MARKET_STRUCTURE_SIGNALS = ['STRAT_212', 'BOS', 'MSS', 'CHoCH'];
const LIQUIDITY_SIGNALS = ['SWEEP_LOW', 'SWEEP_HIGH', 'SMT'];
const ORDER_FLOW_SIGNALS = ['FVG', 'DISPLACEMENT', 'BREAKER'];
const VOLUME_SIGNALS = ['VOLUME_SURGE', 'ORB'];

function getSignalFamily(signal: string): string {
  if (MARKET_STRUCTURE_SIGNALS.includes(signal)) return 'market_structure';
  if (LIQUIDITY_SIGNALS.includes(signal)) return 'liquidity';
  if (ORDER_FLOW_SIGNALS.includes(signal)) return 'order_flow';
  if (VOLUME_SIGNALS.includes(signal)) return 'volume';
  return 'other';
}

export function runDecisionEngine(signal: TradingViewSignal): DecisionAudit {
  const gateResults: GateResult[] = [];
  let blockReason = '';

  // Gate 1: Signal Integrity
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

  // Gate 2: Session & Volatility
  const now = new Date();
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = etTime.getHours();
  const minute = etTime.getMinutes();
  const day = etTime.getDay();
  const isMarketHours = day >= 1 && day <= 5 && 
                        (hour > 9 || (hour === 9 && minute >= 30)) && 
                        hour < 16;
  
  // Check volatility (async - will be checked in API route)
  // For now, just check market hours
  const gate2: GateResult = {
    gate: 'Session & Volatility',
    passed: isMarketHours,
    reason: !isMarketHours ? 'Outside market hours' : undefined,
    // volatilityCheck will be set by API route
  };
  gateResults.push(gate2);
  if (!gate2.passed) {
    return createBlockDecision(signal, gateResults, gate2.reason || 'Market hours check failed');
  }

  // Gate 3: Signal Factorization
  const scoreBreakdown: Record<string, number> = {
    market_structure: 0,
    liquidity: 0,
    order_flow: 0,
    volume: 0,
  };

  signal.active_signals.forEach(sig => {
    const weight = SIGNAL_WEIGHTS[sig] || 0;
    const family = getSignalFamily(sig);
    if (family !== 'other') {
      scoreBreakdown[family] += weight;
    }
  });

  const totalScore = Object.values(scoreBreakdown).reduce((sum, val) => sum + val, 0);
  const gate3 = {
    gate: 'Signal Factorization',
    passed: totalScore >= 6.0,
    reason: totalScore < 6.0 ? `Total score ${totalScore.toFixed(2)} below threshold 6.0` : undefined,
    score: totalScore
  };
  gateResults.push(gate3);
  if (!gate3.passed) {
    return createBlockDecision(signal, gateResults, gate3.reason || 'Signal factorization failed');
  }

  // Gate 4: Role Assignment
  const signalScores = signal.active_signals.map(sig => ({
    signal: sig,
    weight: SIGNAL_WEIGHTS[sig] || 0,
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

  // Gate 5: Weighted Score & Mode
  const marketStructureScore = scoreBreakdown.market_structure;
  const liquidityScore = scoreBreakdown.liquidity;
  const orderFlowScore = scoreBreakdown.order_flow;
  const volumeScore = scoreBreakdown.volume;

  let tradeMode: 'TREND' | 'REVERSAL' | 'BREAKOUT' = 'TREND';
  let minRR = 2.0;

  if (liquidityScore > marketStructureScore && liquidityScore > volumeScore) {
    tradeMode = 'REVERSAL';
    minRR = 3.0;
  } else if (volumeScore > marketStructureScore && volumeScore > liquidityScore) {
    tradeMode = 'BREAKOUT';
    minRR = 2.0;
  } else {
    tradeMode = 'TREND';
    minRR = 2.0;
  }

  // Calculate risk/reward ratio
  // For LONG: (take_profit - entry) / (entry - stop_loss)
  // For SHORT: (entry - take_profit) / (stop_loss - entry)
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

  // Gate 6: Risk & Position Sizing
  const baseRisk = 1000; // 1% of $100k
  const adjustedRisk = tradeMode === 'REVERSAL' ? baseRisk * 0.5 : baseRisk;
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

  // Gate 7: Daily Limits (will be checked in API endpoint with actual DB query)

  // All gates passed - create TRADE decision
  return {
    signal_id: 0, // Will be set by caller
    decision: 'TRADE',
    trade_mode: tradeMode,
    gate_results: gateResults,
    signals: {
      primary: primarySignal,
      confirmations: confirmations,
    },
    score_breakdown: {
      total: totalScore,
      by_family: scoreBreakdown,
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
  };
}

function createBlockDecision(
  signal: TradingViewSignal,
  gateResults: GateResult[],
  reason: string
): DecisionAudit {
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

