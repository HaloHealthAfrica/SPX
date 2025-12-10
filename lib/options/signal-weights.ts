/**
 * Timeframe-Specific Signal Weights
 * Agent 3: Enhanced signal weights by timeframe
 */

import { TimeframeMode } from './timeframe';

export const TIMEFRAME_SIGNAL_WEIGHTS: Record<TimeframeMode, Record<string, number>> = {
  INTRADAY: {
    // Gamma scalping loves momentum and structure breaks
    STRAT_212: 3.0,    // ↑ upgraded - pattern completion is key
    BOS: 3.0,          // ↑ structure breaks are immediate
    MSS: 2.5,
    CHoCH: 2.5,
    SWEEP_LOW: 2.5,    // ↑ liquidity grabs = immediate reversals
    SWEEP_HIGH: 2.5,
    SMT: 1.5,          // ↓ divergences need time
    FVG: 3.5,          // ↑ imbalances fill fast intraday
    DISPLACEMENT: 3.5, // ↑ momentum is everything
    BREAKER: 2.5,
    VOLUME_SURGE: 3.0, // ↑ volume confirms intraday moves
    ORB: 3.5,          // ↑ opening range is intraday specific
  },
  SWING: {
    STRAT_212: 2.5,
    BOS: 2.5,
    MSS: 2.5,
    CHoCH: 3.0,        // ↑ trend changes matter for multi-day
    SWEEP_LOW: 2.5,
    SWEEP_HIGH: 2.5,
    SMT: 2.5,          // ↑ divergences have time to play out
    FVG: 2.5,
    DISPLACEMENT: 2.5,
    BREAKER: 3.0,      // ↑ breaker blocks = swing levels
    VOLUME_SURGE: 2.0,
    ORB: 1.5,          // ↓ less relevant for multi-day
  },
  MONTHLY: {
    STRAT_212: 2.0,
    BOS: 2.5,
    MSS: 3.0,          // ↑ shift in structure = bigger move
    CHoCH: 3.0,
    SWEEP_LOW: 2.0,
    SWEEP_HIGH: 2.0,
    SMT: 3.0,          // ↑ divergences are powerful monthly
    FVG: 2.0,
    DISPLACEMENT: 2.0,
    BREAKER: 3.0,
    VOLUME_SURGE: 1.5,
    ORB: 1.0,
  },
  LEAPS: {
    // Trend and macro structure dominate
    STRAT_212: 1.5,
    BOS: 2.0,
    MSS: 3.5,          // ↑ major structure shifts
    CHoCH: 3.5,        // ↑ trend changes are everything
    SWEEP_LOW: 1.5,
    SWEEP_HIGH: 1.5,
    SMT: 3.0,
    FVG: 1.5,
    DISPLACEMENT: 1.5,
    BREAKER: 2.5,
    VOLUME_SURGE: 1.0,
    ORB: 0.5,
  },
};

/**
 * Get signal weights for a specific timeframe
 */
export function getSignalWeightsForTimeframe(timeframe: TimeframeMode): Record<string, number> {
  return TIMEFRAME_SIGNAL_WEIGHTS[timeframe];
}

/**
 * Calculate score using timeframe-specific weights
 */
export function calculateTimeframeScore(
  activeSignals: string[],
  timeframe: TimeframeMode
): { total: number; by_family: Record<string, number> } {
  const weights = getSignalWeightsForTimeframe(timeframe);
  
  const scoreBreakdown: Record<string, number> = {
    market_structure: 0,
    liquidity: 0,
    order_flow: 0,
    volume: 0,
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

  activeSignals.forEach(sig => {
    const weight = weights[sig] || 0;
    const family = getSignalFamily(sig);
    if (family !== 'other') {
      scoreBreakdown[family] += weight;
    }
  });

  const total = Object.values(scoreBreakdown).reduce((sum, val) => sum + val, 0);

  return { total, by_family: scoreBreakdown };
}


