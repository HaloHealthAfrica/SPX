/**
 * Timeframe Classification and Configuration System
 * Agent 1: Timeframe classification layer
 */

export type TimeframeMode = 'INTRADAY' | 'SWING' | 'MONTHLY' | 'LEAPS';

export interface TimeframeConfig {
  mode: TimeframeMode;
  targetDTE: [number, number];  // min, max days to expiration
  thetaDecayTolerance: number;  // max acceptable daily theta burn as % of position
  minRR: number;
  riskMultiplier: number;       // scales base risk
  holdingPeriod: [number, number]; // expected hold time in hours
  ivRankThreshold: [number, number]; // acceptable IV rank range
  scoreThreshold: number;        // minimum score to pass Gate 3
}

export const TIMEFRAME_CONFIGS: Record<TimeframeMode, TimeframeConfig> = {
  INTRADAY: {
    mode: 'INTRADAY',
    targetDTE: [0, 7],
    thetaDecayTolerance: 0.05,   // 5% - theta burn is the trade
    minRR: 1.5,                   // lower RR acceptable for high-probability scalps
    riskMultiplier: 0.5,          // half size for 0DTE
    holdingPeriod: [0.25, 6],     // 15 min to 6 hours
    ivRankThreshold: [20, 100],   // want elevated IV for premium
    scoreThreshold: 6.0,
  },
  SWING: {
    mode: 'SWING',
    targetDTE: [14, 45],
    thetaDecayTolerance: 0.02,   // 2% max daily decay
    minRR: 2.0,
    riskMultiplier: 1.0,
    holdingPeriod: [24, 240],    // 1-10 days
    ivRankThreshold: [15, 70],
    scoreThreshold: 6.0,
  },
  MONTHLY: {
    mode: 'MONTHLY',
    targetDTE: [30, 60],
    thetaDecayTolerance: 0.015,
    minRR: 2.5,
    riskMultiplier: 1.0,
    holdingPeriod: [72, 504],    // 3-21 days
    ivRankThreshold: [10, 60],
    scoreThreshold: 7.0,
  },
  LEAPS: {
    mode: 'LEAPS',
    targetDTE: [180, 730],
    thetaDecayTolerance: 0.005,  // minimal daily decay
    minRR: 3.0,                   // need higher payoff for capital lockup
    riskMultiplier: 1.5,          // can size up - more time to be right
    holdingPeriod: [720, 4320],  // 30-180 days
    ivRankThreshold: [0, 40],    // want LOW IV for long-dated
    scoreThreshold: 8.0,
  },
};

/**
 * Classify timeframe based on signal characteristics
 * Can be enhanced with explicit timeframe field from signal
 */
export function classifyTimeframe(
  signal: { resolution?: string; timestamp?: number },
  explicitDTE?: number
): TimeframeMode {
  // If explicit DTE provided, use that
  if (explicitDTE !== undefined) {
    if (explicitDTE <= 7) return 'INTRADAY';
    if (explicitDTE <= 45) return 'SWING';
    if (explicitDTE <= 60) return 'MONTHLY';
    return 'LEAPS';
  }

  // Classify based on resolution
  const resolution = signal.resolution || '1D';
  
  if (resolution.includes('m') || resolution === '1H' || resolution === '5M' || resolution === '15M') {
    return 'INTRADAY';
  }
  
  if (resolution === '1D' || resolution === '4H') {
    return 'SWING';
  }
  
  if (resolution === '1W') {
    return 'MONTHLY';
  }
  
  // Default to SWING for unknown resolutions
  return 'SWING';
}

/**
 * Get timeframe config for a given mode
 */
export function getTimeframeConfig(mode: TimeframeMode): TimeframeConfig {
  return TIMEFRAME_CONFIGS[mode];
}


