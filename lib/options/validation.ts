/**
 * Options Validation Gate (Gate 2.5)
 * Agent 2: Options-specific validation
 */

import { OptionsGateInput, OptionsGateResult } from './types';
import { TimeframeConfig, TimeframeMode } from './timeframe';

export function gateOptionsValidation(
  input: OptionsGateInput,
  config: TimeframeConfig,
  direction: 'LONG' | 'SHORT'
): OptionsGateResult {
  const checks: { name: string; passed: boolean; reason: string }[] = [];

  // 1. Liquidity Check
  const liquidityScore = (input.volume * 0.4) + (input.openInterest * 0.6);
  const minLiquidity = config.mode === 'INTRADAY' ? 1000 : 500;
  const maxSpreadPercent = config.mode === 'INTRADAY' ? 0.10 : 0.15;
  
  checks.push({
    name: 'Liquidity',
    passed: liquidityScore >= minLiquidity && input.bidAskSpread <= maxSpreadPercent,
    reason: `OI: ${input.openInterest}, Vol: ${input.volume}, Spread: ${(input.bidAskSpread * 100).toFixed(1)}%`
  });

  // 2. IV Regime Check
  const [minIV, maxIV] = config.ivRankThreshold;
  const ivInRange = input.ivRank >= minIV && input.ivRank <= maxIV;
  checks.push({
    name: 'IV Regime',
    passed: ivInRange,
    reason: `IV Rank ${input.ivRank} ${ivInRange ? 'within' : 'outside'} [${minIV}-${maxIV}]`
  });

  // 3. Theta Decay Check (for long options)
  if (direction === 'LONG') {
    const dailyThetaBurn = Math.abs(input.greeks.theta) / input.currentPrice;
    checks.push({
      name: 'Theta Tolerance',
      passed: dailyThetaBurn <= config.thetaDecayTolerance,
      reason: `Daily decay: ${(dailyThetaBurn * 100).toFixed(2)}% vs max ${(config.thetaDecayTolerance * 100)}%`
    });
  }

  // 4. Delta Appropriateness
  const absDelta = Math.abs(input.greeks.delta);
  const deltaRanges: Record<TimeframeMode, [number, number]> = {
    INTRADAY: [0.40, 0.70],  // ATM-ish for gamma
    SWING: [0.30, 0.60],
    MONTHLY: [0.25, 0.55],
    LEAPS: [0.60, 0.85],     // deeper ITM for LEAPS (stock replacement)
  };
  const [minDelta, maxDelta] = deltaRanges[config.mode];
  checks.push({
    name: 'Delta Range',
    passed: absDelta >= minDelta && absDelta <= maxDelta,
    reason: `Delta ${absDelta.toFixed(2)} ${absDelta >= minDelta && absDelta <= maxDelta ? 'within' : 'outside'} [${minDelta}-${maxDelta}]`
  });

  // 5. DTE Validation
  const dte = Math.floor((input.expiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const [minDTE, maxDTE] = config.targetDTE;
  checks.push({
    name: 'DTE Range',
    passed: dte >= minDTE && dte <= maxDTE,
    reason: `${dte} DTE ${dte >= minDTE && dte <= maxDTE ? 'within' : 'outside'} [${minDTE}-${maxDTE}]`
  });

  return {
    gate: 'Options Validation',
    passed: checks.every(c => c.passed),
    details: checks,
    reason: checks.find(c => !c.passed)?.reason || 'All options checks passed'
  };
}


