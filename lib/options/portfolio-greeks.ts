/**
 * Portfolio-Level Greeks Management
 * Agent 8: Track aggregate exposure across all positions
 */

import { PortfolioGreeks, PortfolioLimits, GreeksBasedSizing } from './types';

export const DEFAULT_PORTFOLIO_LIMITS: PortfolioLimits = {
  maxAbsDelta: 1000,        // e.g., 1000 (equivalent to 1000 shares SPY)
  maxAbsGamma: 500,          // limits convexity risk
  maxNegativeTheta: -500,    // max daily bleed ($500/day)
  maxAbsVega: 2000,          // IV move protection (2% per 1 IV point)
};

export function checkPortfolioLimits(
  currentGreeks: PortfolioGreeks,
  proposedTrade: GreeksBasedSizing,
  limits: PortfolioLimits = DEFAULT_PORTFOLIO_LIMITS
): { approved: boolean; breaches: string[] } {
  const breaches: string[] = [];

  const newDelta = currentGreeks.totalDelta + proposedTrade.totalDelta;
  const newGamma = currentGreeks.totalGamma + proposedTrade.totalGamma;
  const newTheta = currentGreeks.totalTheta + proposedTrade.totalTheta;
  const newVega = currentGreeks.totalVega + proposedTrade.totalVega;

  if (Math.abs(newDelta) > limits.maxAbsDelta) {
    breaches.push(`Delta limit: ${newDelta.toFixed(0)} exceeds ±${limits.maxAbsDelta}`);
  }
  if (Math.abs(newGamma) > limits.maxAbsGamma) {
    breaches.push(`Gamma limit: ${newGamma.toFixed(0)} exceeds ±${limits.maxAbsGamma}`);
  }
  if (newTheta < limits.maxNegativeTheta) {
    breaches.push(`Theta limit: ${newTheta.toFixed(0)} exceeds ${limits.maxNegativeTheta}/day`);
  }
  if (Math.abs(newVega) > limits.maxAbsVega) {
    breaches.push(`Vega limit: ${newVega.toFixed(0)} exceeds ±${limits.maxAbsVega}`);
  }

  return { approved: breaches.length === 0, breaches };
}

/**
 * Calculate current portfolio Greeks from all open positions
 * Would query database for all open option positions
 */
export function calculatePortfolioGreeks(
  positions: Array<{
    totalDelta: number;
    totalGamma: number;
    totalTheta: number;
    totalVega: number;
  }>
): PortfolioGreeks {
  const total = positions.reduce(
    (acc, pos) => ({
      totalDelta: acc.totalDelta + pos.totalDelta,
      totalGamma: acc.totalGamma + pos.totalGamma,
      totalTheta: acc.totalTheta + pos.totalTheta,
      totalVega: acc.totalVega + pos.totalVega,
    }),
    { totalDelta: 0, totalGamma: 0, totalTheta: 0, totalVega: 0 }
  );

  // Beta-weighted delta would require beta calculation
  // For SPX, beta is typically 1.0
  return {
    ...total,
    betaWeightedDelta: total.totalDelta, // Simplified - would multiply by beta
  };
}


