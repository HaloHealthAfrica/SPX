/**
 * Event-Aware Trading Calendar
 * Agent 7: Options are heavily affected by events
 */

import { MarketEvent, MarketEventType } from './types';
import { TimeframeMode } from './timeframe';
import { TimeframeConfig } from './timeframe';

export interface EventAdjustment {
  approved: boolean;
  adjustments: string[];
  warnings: string[];
}

export function isEventInHoldingPeriod(
  eventDate: Date,
  timeframe: TimeframeMode,
  config: TimeframeConfig
): boolean {
  const now = Date.now();
  const eventTime = eventDate.getTime();
  const [minHours, maxHours] = config.holdingPeriod;
  
  const hoursUntilEvent = (eventTime - now) / (1000 * 60 * 60);
  
  // Event is in holding period if it's within the expected hold time
  return hoursUntilEvent >= 0 && hoursUntilEvent <= maxHours;
}

export function adjustForEvents(
  signal: { symbol: string; direction: 'LONG' | 'SHORT' },
  timeframe: TimeframeMode,
  config: TimeframeConfig,
  events: MarketEvent[]
): EventAdjustment {
  const adjustments: string[] = [];
  const warnings: string[] = [];

  const relevantEvents = events.filter(e => 
    (!e.symbol || e.symbol === signal.symbol) &&
    isEventInHoldingPeriod(e.date, timeframe, config)
  );

  for (const event of relevantEvents) {
    if (event.type === 'EARNINGS' && signal.symbol === event.symbol) {
      if (timeframe === 'INTRADAY' || timeframe === 'SWING') {
        warnings.push(`⚠️ Earnings on ${event.date.toDateString()} - expect IV crush post-event`);

        // Don't hold long options through earnings unless intentional
        if (signal.direction === 'LONG') {
          adjustments.push('Consider closing before earnings or switching to defined-risk spread');
        }
      }
    }

    if (event.type === 'FOMC' || event.type === 'CPI') {
      if (timeframe === 'INTRADAY') {
        warnings.push(`⚠️ ${event.type} on ${event.date.toDateString()} - elevated volatility expected`);
        adjustments.push('Reduce position size by 50% around macro events');
      }
    }

    if (event.type === 'OPEX') {
      if (timeframe === 'SWING' || timeframe === 'MONTHLY') {
        warnings.push(`📅 Monthly OPEX on ${event.date.toDateString()} - pin risk and gamma exposure elevated`);
      }
    }

    if (event.type === 'NFP') {
      if (timeframe === 'INTRADAY') {
        warnings.push(`📊 NFP on ${event.date.toDateString()} - expect gap and volatility spike`);
        adjustments.push('Consider waiting until after NFP release');
      }
    }
  }

  return {
    approved: warnings.length < 3, // Block if too many concerns
    adjustments,
    warnings,
  };
}

/**
 * Get upcoming market events (would integrate with external calendar API)
 * This is a placeholder - in production, would fetch from calendar service
 */
export function getUpcomingEvents(symbol?: string, daysAhead: number = 30): MarketEvent[] {
  // Placeholder - would fetch from external API
  // For now, return empty array
  return [];
}


