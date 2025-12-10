/**
 * Greeks-Aware Position Sizing
 * Agent 5: Replace simple risk/price_diff with Greeks-based sizing
 */

import { GreeksBasedSizing, OptionStrategy, OptionLeg } from './types';
import { TimeframeConfig, TimeframeMode } from './timeframe';
import { calculateStrategyMaxLoss, aggregateGreeks } from './strategy-selection';

export function calculateOptionsPositionSize(
  strategy: OptionStrategy,
  legs: OptionLeg[],
  accountSize: number,
  riskPercent: number,
  timeframe: TimeframeMode,
  tradeMode: 'TREND' | 'REVERSAL' | 'BREAKOUT',
  timeframeConfig: TimeframeConfig
): GreeksBasedSizing {
  const baseRisk = accountSize * riskPercent;

  // Apply timeframe and mode adjustments
  const timeframeMultiplier = timeframeConfig.riskMultiplier;
  const modeMultiplier = tradeMode === 'REVERSAL' ? 0.5 : 1.0;
  const adjustedRisk = baseRisk * timeframeMultiplier * modeMultiplier;

  // Calculate max loss per contract for the strategy
  const maxLossPerContract = calculateStrategyMaxLoss(strategy, legs);

  // Size based on max loss, not just premium
  let contracts = Math.floor(adjustedRisk / maxLossPerContract);

  // Apply Greeks-based constraints
  const perContractGreeks = aggregateGreeks(legs);

  // Constraint 1: Max portfolio delta exposure (e.g., 500 delta = 500 shares equivalent)
  const maxDeltaExposure = accountSize * 0.05; // 5% of account in delta terms
  const deltaConstrainedContracts = Math.floor(
    maxDeltaExposure / (Math.abs(perContractGreeks.delta) * 100)
  );

  // Constraint 2: Max daily theta burn
  const maxDailyTheta = accountSize * 0.005; // 0.5% max daily decay
  const thetaConstrainedContracts = Math.floor(
    maxDailyTheta / Math.abs(perContractGreeks.theta)
  );

  // Constraint 3: Max vega exposure (IV move protection)
  const maxVegaExposure = accountSize * 0.02; // 2% per 1 IV point move
  const vegaConstrainedContracts = Math.floor(
    maxVegaExposure / Math.abs(perContractGreeks.vega)
  );

  // Take the most restrictive
  contracts = Math.min(
    contracts,
    deltaConstrainedContracts,
    thetaConstrainedContracts,
    vegaConstrainedContracts,
    50 // hard max contracts
  );

  contracts = Math.max(1, contracts); // minimum 1 contract

  // Calculate aggregate Greeks for the position
  const totalDelta = perContractGreeks.delta * contracts * 100;
  const totalGamma = perContractGreeks.gamma * contracts * 100;
  const totalTheta = perContractGreeks.theta * contracts;
  const totalVega = perContractGreeks.vega * contracts;

  return {
    contracts,
    totalDelta,
    totalGamma,
    totalTheta,
    totalVega,
    maxLossAtExpiry: maxLossPerContract * contracts,
    notionalExposure: legs[0].underlyingPrice * Math.abs(perContractGreeks.delta) * contracts * 100,
  };
}


