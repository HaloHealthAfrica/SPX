/**
 * Strategy Selection Engine
 * Agent 4: Select optimal option strategy based on conditions
 */

import { OptionStrategy, OptionLeg, StrategyRecommendation, ConvictionLevel } from './types';
import { TimeframeMode } from './timeframe';

export function selectStrategy(
  direction: 'LONG' | 'SHORT' | 'NEUTRAL',
  tradeMode: 'TREND' | 'REVERSAL' | 'BREAKOUT',
  timeframe: TimeframeMode,
  ivRank: number,
  conviction: ConvictionLevel
): OptionStrategy {
  // High IV = sell premium, Low IV = buy premium
  const ivRegime = ivRank > 50 ? 'HIGH' : 'LOW';

  // Strategy matrix
  if (timeframe === 'INTRADAY') {
    // Intraday = simple structures for speed
    if (direction === 'LONG') return 'LONG_CALL';
    if (direction === 'SHORT') return 'LONG_PUT';
    return 'LONG_STRADDLE'; // neutral but expecting move
  }

  if (timeframe === 'SWING') {
    if (ivRegime === 'HIGH') {
      // Sell premium in high IV
      if (direction === 'LONG') return 'PUT_CREDIT_SPREAD';   // bullish
      if (direction === 'SHORT') return 'CALL_CREDIT_SPREAD'; // bearish
      return 'IRON_CONDOR';  // neutral
    } else {
      // Buy premium in low IV
      if (conviction === 'HIGH') {
        return direction === 'LONG' ? 'LONG_CALL' : 'LONG_PUT';
      }
      return direction === 'LONG' ? 'CALL_DEBIT_SPREAD' : 'PUT_DEBIT_SPREAD';
    }
  }

  if (timeframe === 'MONTHLY') {
    if (ivRegime === 'HIGH' && conviction !== 'HIGH') {
      // Defined risk credit strategies
      if (direction === 'LONG') return 'PUT_CREDIT_SPREAD';
      if (direction === 'SHORT') return 'CALL_CREDIT_SPREAD';
      return 'IRON_BUTTERFLY';
    }
    // Calendar spreads exploit IV term structure
    if (tradeMode === 'TREND') return 'DIAGONAL_SPREAD';
    return direction === 'LONG' ? 'CALL_DEBIT_SPREAD' : 'PUT_DEBIT_SPREAD';
  }

  if (timeframe === 'LEAPS') {
    // LEAPS = stock replacement, want high delta
    if (conviction === 'HIGH' && ivRegime === 'LOW') {
      return direction === 'LONG' ? 'LONG_CALL' : 'LONG_PUT';
    }
    // PMCC if you want income while holding
    if (direction === 'LONG') return 'PMCC';
    return 'DIAGONAL_SPREAD';
  }

  // Default fallback
  return direction === 'LONG' ? 'CALL_DEBIT_SPREAD' : 'PUT_DEBIT_SPREAD';
}

/**
 * Calculate strategy max loss
 * Simplified - would need actual option pricing in production
 */
export function calculateStrategyMaxLoss(
  strategy: OptionStrategy,
  legs: OptionLeg[]
): number {
  // For simple long options, max loss is premium paid
  if (strategy === 'LONG_CALL' || strategy === 'LONG_PUT') {
    return legs[0].entryPrice * Math.abs(legs[0].quantity) * 100;
  }

  // For spreads, max loss is the width minus credit (or premium paid)
  if (strategy.includes('DEBIT_SPREAD')) {
    const longLeg = legs.find(l => l.quantity > 0);
    const shortLeg = legs.find(l => l.quantity < 0);
    if (longLeg && shortLeg) {
      const width = Math.abs(longLeg.strike - shortLeg.strike);
      const netDebit = (longLeg.entryPrice - Math.abs(shortLeg.entryPrice)) * Math.abs(longLeg.quantity) * 100;
      return netDebit; // Max loss is what you paid
    }
  }

  if (strategy.includes('CREDIT_SPREAD')) {
    const longLeg = legs.find(l => l.quantity > 0);
    const shortLeg = legs.find(l => l.quantity < 0);
    if (longLeg && shortLeg) {
      const width = Math.abs(longLeg.strike - shortLeg.strike);
      const netCredit = (Math.abs(shortLeg.entryPrice) - longLeg.entryPrice) * Math.abs(shortLeg.quantity) * 100;
      return width * Math.abs(shortLeg.quantity) * 100 - netCredit; // Max loss is width minus credit
    }
  }

  // Default: sum of all premiums paid
  return legs.reduce((sum, leg) => {
    return sum + (leg.entryPrice * Math.abs(leg.quantity) * 100);
  }, 0);
}

/**
 * Aggregate Greeks for a multi-leg strategy
 */
export function aggregateGreeks(legs: OptionLeg[]): {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
} {
  return legs.reduce(
    (acc, leg) => ({
      delta: acc.delta + (leg.greeks.delta * leg.quantity),
      gamma: acc.gamma + (leg.greeks.gamma * leg.quantity),
      theta: acc.theta + (leg.greeks.theta * leg.quantity),
      vega: acc.vega + (leg.greeks.vega * leg.quantity),
    }),
    { delta: 0, gamma: 0, theta: 0, vega: 0 }
  );
}


