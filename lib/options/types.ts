/**
 * Options Trading Type Definitions
 * Agent 1: Core types for options trading
 */

import { TimeframeMode } from './timeframe';

export type OptionType = 'CALL' | 'PUT';

export type OptionStrategy = 
  | 'LONG_CALL' | 'LONG_PUT'
  | 'CALL_DEBIT_SPREAD' | 'PUT_DEBIT_SPREAD'
  | 'CALL_CREDIT_SPREAD' | 'PUT_CREDIT_SPREAD'
  | 'LONG_STRADDLE' | 'LONG_STRANGLE'
  | 'IRON_CONDOR' | 'IRON_BUTTERFLY'
  | 'CALENDAR_SPREAD' | 'DIAGONAL_SPREAD'
  | 'PMCC';  // Poor Man's Covered Call

export interface OptionLeg {
  symbol: string;
  strike: number;
  expiration: Date;
  optionType: OptionType;
  quantity: number;  // positive for long, negative for short
  entryPrice: number;
  underlyingPrice: number;
  impliedVolatility: number;
  ivRank: number;
  ivPercentile: number;
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  bidAskSpread: number;
  openInterest: number;
  volume: number;
}

export interface OptionsGateInput {
  underlying: string;
  strike: number;
  expiration: Date;
  optionType: OptionType;
  currentPrice: number;
  impliedVolatility: number;
  ivRank: number;           // 0-100, where current IV sits vs 52-week range
  ivPercentile: number;     // % of days IV was lower than current
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  bidAskSpread: number;
  openInterest: number;
  volume: number;
}

export interface OptionsGateResult {
  gate: string;
  passed: boolean;
  reason?: string;
  details?: Array<{
    name: string;
    passed: boolean;
    reason: string;
  }>;
}

export interface StrategyRecommendation {
  strategy: OptionStrategy;
  confidence: number;
  rationale: string;
  legs: OptionLeg[];
  maxLoss: number;
  maxGain: number;
  breakevens: number[];
}

export interface GreeksBasedSizing {
  contracts: number;
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  maxLossAtExpiry: number;
  notionalExposure: number;
}

export interface ExitRule {
  type: 'PROFIT_TARGET' | 'STOP_LOSS' | 'TIME_STOP' | 'THETA_STOP' | 'IV_CRUSH' | 'DELTA_HEDGE';
  trigger: number;
  action: 'CLOSE_FULL' | 'CLOSE_HALF' | 'ROLL' | 'HEDGE';
}

export type MarketEventType = 'EARNINGS' | 'FOMC' | 'CPI' | 'NFP' | 'OPEX' | 'DIVIDEND';

export interface MarketEvent {
  date: Date;
  type: MarketEventType;
  symbol?: string;  // undefined = market-wide
  expectedMove?: number;
  ivImpact: 'EXPANSION' | 'CRUSH' | 'NEUTRAL';
}

export interface PortfolioGreeks {
  totalDelta: number;      // Net directional exposure
  totalGamma: number;     // Acceleration of delta
  totalTheta: number;     // Daily time decay
  totalVega: number;      // IV sensitivity
  betaWeightedDelta: number; // SPY-normalized delta
}

export interface PortfolioLimits {
  maxAbsDelta: number;     // e.g., 1000 (equivalent to 1000 shares SPY)
  maxAbsGamma: number;     // limits convexity risk
  maxNegativeTheta: number; // max daily bleed
  maxAbsVega: number;      // IV move protection
}

export type ConvictionLevel = 'HIGH' | 'MEDIUM' | 'LOW';


