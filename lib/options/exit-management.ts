/**
 * Dynamic Exit Management
 * Agent 6: Options need dynamic exits, not just static TP/SL
 */

import { ExitRule, OptionStrategy } from './types';
import { TimeframeMode } from './timeframe';

export function generateExitRules(
  timeframe: TimeframeMode,
  strategy: OptionStrategy,
  entryIV: number,
  entryDTE: number
): ExitRule[] {
  const rules: ExitRule[] = [];

  // Universal profit targets
  rules.push({ type: 'PROFIT_TARGET', trigger: 0.50, action: 'CLOSE_HALF' });  // 50% profit = trim
  rules.push({ type: 'PROFIT_TARGET', trigger: 1.00, action: 'CLOSE_FULL' }); // 100% = close

  // Timeframe-specific stops
  if (timeframe === 'INTRADAY') {
    rules.push({ type: 'STOP_LOSS', trigger: -0.30, action: 'CLOSE_FULL' });    // 30% loss
    rules.push({ type: 'TIME_STOP', trigger: 4, action: 'CLOSE_FULL' });        // 4 hours max
  } else if (timeframe === 'SWING') {
    rules.push({ type: 'STOP_LOSS', trigger: -0.40, action: 'CLOSE_FULL' });
    rules.push({ type: 'THETA_STOP', trigger: 14, action: 'ROLL' });            // Roll at 14 DTE
  } else if (timeframe === 'MONTHLY') {
    rules.push({ type: 'STOP_LOSS', trigger: -0.50, action: 'CLOSE_FULL' });
    rules.push({ type: 'THETA_STOP', trigger: 21, action: 'ROLL' });
    rules.push({ type: 'IV_CRUSH', trigger: -0.20, action: 'CLOSE_HALF' });     // 20% IV drop
  } else if (timeframe === 'LEAPS') {
    rules.push({ type: 'STOP_LOSS', trigger: -0.35, action: 'CLOSE_HALF' });    // Partial stop
    rules.push({ type: 'THETA_STOP', trigger: 90, action: 'ROLL' });            // Roll at 90 DTE
  }

  // Strategy-specific rules
  if (strategy === 'LONG_STRADDLE' || strategy === 'LONG_STRANGLE') {
    rules.push({ type: 'IV_CRUSH', trigger: -0.15, action: 'CLOSE_FULL' });     // IV crush kills straddles
  }

  if (strategy.includes('CREDIT')) {
    rules.push({ type: 'PROFIT_TARGET', trigger: 0.50, action: 'CLOSE_FULL' }); // Take profits early on credit
  }

  return rules;
}

/**
 * Check if any exit rule should trigger
 */
export function checkExitRules(
  rules: ExitRule[],
  currentPnLPercent: number,
  currentDTE: number,
  currentIV: number,
  entryIV: number,
  hoursHeld: number
): ExitRule | null {
  for (const rule of rules) {
    switch (rule.type) {
      case 'PROFIT_TARGET':
        if (currentPnLPercent >= rule.trigger) {
          return rule;
        }
        break;
      
      case 'STOP_LOSS':
        if (currentPnLPercent <= rule.trigger) {
          return rule;
        }
        break;
      
      case 'TIME_STOP':
        if (hoursHeld >= rule.trigger) {
          return rule;
        }
        break;
      
      case 'THETA_STOP':
        if (currentDTE <= rule.trigger) {
          return rule;
        }
        break;
      
      case 'IV_CRUSH':
        const ivChange = (currentIV - entryIV) / entryIV;
        if (ivChange <= rule.trigger) {
          return rule;
        }
        break;
      
      case 'DELTA_HEDGE':
        // Would need current delta vs target delta
        // Placeholder for future implementation
        break;
    }
  }
  
  return null;
}


