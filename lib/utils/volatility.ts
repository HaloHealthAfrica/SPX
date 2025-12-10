/**
 * Volatility checks using VIX and ATR
 */

interface VolatilityCheck {
  vix: number | null;
  vixThreshold: number;
  atr: number | null;
  atrThreshold: number;
  isHighVolatility: boolean;
  reason?: string;
}

/**
 * Fetch VIX from market data
 * VIX is typically available as $VIX or VIX symbol
 */
export async function getVIX(): Promise<number | null> {
  try {
    // Use real VIX provider
    const marketData = await import('../market-data');
    return await marketData.getVIX();
  } catch (error) {
    console.error('Failed to fetch VIX:', error);
    return null;
  }
}

/**
 * Calculate ATR (Average True Range) approximation
 * This is a simplified version - in production, use proper ATR calculation
 */
export async function getATR(symbol: string, period: number = 14): Promise<number | null> {
  try {
    // ATR calculation requires historical price data
    // For now, return null and log warning
    console.warn('ATR calculation not yet implemented - requires historical data');
    return null;
  } catch (error) {
    console.error('Failed to calculate ATR:', error);
    return null;
  }
}

/**
 * Check volatility conditions
 */
export async function checkVolatility(
  symbol: string,
  vixThreshold: number = 30,
  atrMultiplier: number = 2.0
): Promise<VolatilityCheck> {
  const vix = await getVIX();
  const atr = await getATR(symbol);
  
  const check: VolatilityCheck = {
    vix,
    vixThreshold,
    atr,
    atrThreshold: 0, // Would need current price to calculate
    isHighVolatility: false,
  };

  // Check VIX
  if (vix !== null && vix > vixThreshold) {
    check.isHighVolatility = true;
    check.reason = `VIX (${vix.toFixed(2)}) exceeds threshold (${vixThreshold})`;
    return check;
  }

  // Check ATR (if available)
  if (atr !== null) {
    // ATR check would require current price and comparison
    // For now, we'll skip ATR check if VIX is available
    if (vix === null && atr > 0) {
      // Simplified ATR check - in production, compare to average ATR
      check.reason = `ATR check requires historical comparison (not yet implemented)`;
    }
  }

  return check;
}

/**
 * Simplified volatility check using VIX only
 * Returns true if volatility is acceptable for trading
 */
export async function isVolatilityAcceptable(
  vixThreshold: number = 30
): Promise<{ acceptable: boolean; vix?: number; reason?: string }> {
  const vix = await getVIX();
  
  if (vix === null) {
    // If VIX unavailable, allow trade (fail open)
    return { acceptable: true, reason: 'VIX data unavailable, allowing trade' };
  }

  if (vix > vixThreshold) {
    return {
      acceptable: false,
      vix,
      reason: `High volatility: VIX (${vix.toFixed(2)}) exceeds threshold (${vixThreshold})`,
    };
  }

  return { acceptable: true, vix };
}

