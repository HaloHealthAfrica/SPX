/**
 * Strike Selector Service
 * Agent 3: Options strike selection following best practices
 */

import { MarketDataService } from './market-data.service';
import { OptionsChain, OptionQuote } from '../market-data';
import { TimeframeMode, getTimeframeConfig } from '../options/timeframe';
import { OptionStrategy, OptionType } from '../options/types';

export interface StrikeSelectionCriteria {
  underlyingPrice: number;
  direction: 'LONG' | 'SHORT';
  timeframe: TimeframeMode;
  strategy: OptionStrategy;
  targetDelta?: number;
  targetDTE?: number;
  maxPremium?: number;
  minRR?: number;
  ivRank?: number;
}

export interface SelectedStrike {
  strike: number;
  expiration: Date;
  optionType: OptionType;
  quote: OptionQuote;
  delta: number;
  dte: number;
  premium: number;
  maxLoss: number;
  maxGain: number;
  breakeven: number;
  riskReward: number;
  liquidityScore: number;
  selectionReason: string;
}

export interface StrikeSelectionResult {
  primary: SelectedStrike;
  secondary?: SelectedStrike; // For spreads
  strategy: OptionStrategy;
  totalCost: number;
  maxLoss: number;
  maxGain: number;
  breakevens: number[];
  riskReward: number;
}

export class StrikeSelectorService {
  private marketData: MarketDataService;

  constructor(marketData: MarketDataService) {
    this.marketData = marketData;
  }

  /**
   * Select optimal strike(s) based on criteria
   */
  async selectStrikes(criteria: StrikeSelectionCriteria): Promise<StrikeSelectionResult> {
    const timeframeConfig = getTimeframeConfig(criteria.timeframe);
    
    // Get IV rank if not provided
    let ivRank = criteria.ivRank;
    if (ivRank === undefined) {
      try {
        ivRank = await this.marketData.getIVRank(criteria.underlyingPrice.toString());
      } catch (error) {
        console.warn('[StrikeSelector] Failed to get IV rank, using default 50');
        ivRank = 50;
      }
    }
    
    // Update criteria with IV rank
    const enhancedCriteria = { ...criteria, ivRank };
    
    // Get options chain
    const expiration = this.calculateExpiration(criteria.targetDTE || timeframeConfig.targetDTE[0]);
    const chain = await this.marketData.getOptionsChain(criteria.underlyingPrice.toString(), expiration);
    
    // Filter strikes by strategy
    if (enhancedCriteria.strategy === 'LONG_CALL' || enhancedCriteria.strategy === 'LONG_PUT') {
      return this.selectLongOption(chain, enhancedCriteria, timeframeConfig);
    }
    
    if (enhancedCriteria.strategy.includes('DEBIT_SPREAD')) {
      return this.selectDebitSpread(chain, enhancedCriteria, timeframeConfig);
    }
    
    if (enhancedCriteria.strategy.includes('CREDIT_SPREAD')) {
      return this.selectCreditSpread(chain, enhancedCriteria, timeframeConfig);
    }
    
    // Default: long option
    return this.selectLongOption(chain, enhancedCriteria, timeframeConfig);
  }

  /**
   * Select strike for long option (CALL or PUT)
   */
  private async selectLongOption(
    chain: OptionsChain,
    criteria: StrikeSelectionCriteria,
    timeframeConfig: any
  ): Promise<StrikeSelectionResult> {
    const optionType: OptionType = criteria.direction === 'LONG' ? 'CALL' : 'PUT';
    const targetDelta = criteria.targetDelta || this.getTargetDelta(criteria.timeframe);
    
    // Filter strikes by delta range
    const candidateStrikes = chain.strikes
      .map(strikeData => {
        const quote = optionType === 'CALL' ? strikeData.call : strikeData.put;
        if (!quote) return null; // Skip if quote is undefined
        return {
          strike: strikeData.strike,
          quote,
          delta: quote.delta || 0,
          dte: Math.floor((chain.expiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .filter(c => {
        const deltaRange = this.getDeltaRange(criteria.timeframe);
        return Math.abs(c.delta) >= deltaRange[0] && Math.abs(c.delta) <= deltaRange[1];
      })
      .filter(c => {
        // Liquidity check
        return c.quote.openInterest >= this.getMinOI(criteria.timeframe) &&
               c.quote.volume >= this.getMinVolume(criteria.timeframe) &&
               this.calculateSpreadPercent(c.quote) <= this.getMaxSpread(criteria.timeframe);
      });

    if (candidateStrikes.length === 0) {
      throw new Error('No suitable strikes found matching criteria');
    }

    // Score each strike
    const scoredStrikes = candidateStrikes.map(c => {
      const premium = c.quote.last;
      const liquidityScore = this.calculateLiquidityScore(c.quote);
      const deltaScore = 1 - Math.abs(Math.abs(c.delta) - targetDelta) / 0.5; // Closer to target = higher score
      const premiumScore = criteria.maxPremium 
        ? Math.max(0, 1 - (premium / criteria.maxPremium))
        : 1;
      
      const totalScore = (liquidityScore * 0.4) + (deltaScore * 0.3) + (premiumScore * 0.3);
      
      // Calculate R:R if we have stop loss
      let riskReward = 0;
      if (criteria.minRR) {
        const maxLoss = premium;
        const targetPrice = criteria.direction === 'LONG'
          ? criteria.underlyingPrice + (criteria.underlyingPrice - c.strike) * 2
          : criteria.underlyingPrice - (c.strike - criteria.underlyingPrice) * 2;
        const maxGain = Math.max(0, targetPrice - c.strike) - premium; // Simplified
        riskReward = maxGain / maxLoss;
      }
      
      return {
        ...c,
        premium,
        maxLoss: premium,
        maxGain: 0, // Unlimited for long options
        breakeven: optionType === 'CALL' 
          ? c.strike + premium
          : c.strike - premium,
        riskReward: riskReward || 999, // Unlimited upside
        liquidityScore,
        totalScore,
        selectionReason: `Delta: ${c.delta.toFixed(2)}, Liquidity: ${liquidityScore.toFixed(2)}`,
      };
    });

    // Select best strike
    const best = scoredStrikes.sort((a, b) => b.totalScore - a.totalScore)[0];
    
    // Filter by min R:R if specified
    const validStrikes = criteria.minRR !== undefined
      ? scoredStrikes.filter(s => s.riskReward >= (criteria.minRR || 0))
      : scoredStrikes;
    
    const selected = validStrikes.length > 0 
      ? validStrikes.sort((a, b) => b.totalScore - a.totalScore)[0]
      : best;

    return {
      primary: {
        strike: selected.strike,
        expiration: chain.expiration,
        optionType,
        quote: selected.quote,
        delta: selected.delta,
        dte: selected.dte,
        premium: selected.premium,
        maxLoss: selected.maxLoss,
        maxGain: selected.maxGain,
        breakeven: selected.breakeven,
        riskReward: selected.riskReward,
        liquidityScore: selected.liquidityScore,
        selectionReason: selected.selectionReason,
      },
      strategy: criteria.strategy,
      totalCost: selected.premium,
      maxLoss: selected.maxLoss,
      maxGain: selected.maxGain,
      breakevens: [selected.breakeven],
      riskReward: selected.riskReward,
    };
  }

  /**
   * Select strikes for debit spread
   */
  private async selectDebitSpread(
    chain: OptionsChain,
    criteria: StrikeSelectionCriteria,
    timeframeConfig: any
  ): Promise<StrikeSelectionResult> {
    const optionType: OptionType = criteria.direction === 'LONG' ? 'CALL' : 'PUT';
    const targetDelta = criteria.targetDelta || this.getTargetDelta(criteria.timeframe);
    
    // For debit spreads, buy lower strike, sell higher strike (calls) or vice versa (puts)
    const strikes = chain.strikes
      .filter(s => {
        const quote = optionType === 'CALL' ? s.call : s.put;
        if (!quote) return false;
        return quote.openInterest >= this.getMinOI(criteria.timeframe) &&
               this.calculateSpreadPercent(quote) <= this.getMaxSpread(criteria.timeframe);
      })
      .sort((a, b) => a.strike - b.strike);

    if (strikes.length < 2) {
      throw new Error('Not enough strikes for spread');
    }

    // Find optimal spread width (typically 5-10% of underlying)
    const spreadWidth = criteria.underlyingPrice * 0.05; // 5% default
    
    let bestSpread: any = null;
    let bestScore = -1;

    for (let i = 0; i < strikes.length - 1; i++) {
      const longStrike = optionType === 'CALL' ? strikes[i] : strikes[i + 1];
      const shortStrike = optionType === 'CALL' ? strikes[i + 1] : strikes[i];
      
      const longQuote = optionType === 'CALL' ? longStrike.call : longStrike.put;
      const shortQuote = optionType === 'CALL' ? shortStrike.call : shortStrike.put;
      
      if (!longQuote || !shortQuote) continue; // Skip if quotes are missing
      const width = Math.abs(shortStrike.strike - longStrike.strike);
      if (width < spreadWidth * 0.5 || width > spreadWidth * 2) continue;
      
      const netDebit = longQuote.last - shortQuote.last;
      const maxLoss = netDebit;
      const maxGain = width - netDebit;
      const riskReward = maxGain / maxLoss;
      
      if (criteria.minRR !== undefined && riskReward < (criteria.minRR || 0)) continue;
      
      const liquidityScore = (this.calculateLiquidityScore(longQuote) + 
                             this.calculateLiquidityScore(shortQuote)) / 2;
      
      const score = (riskReward * 0.5) + (liquidityScore * 0.3) + 
                   (1 - (netDebit / width)) * 0.2; // Lower debit = better
      
      if (score > bestScore) {
        bestScore = score;
        bestSpread = {
          long: {
            strike: longStrike.strike,
            quote: longQuote,
            delta: longQuote.delta,
          },
          short: {
            strike: shortStrike.strike,
            quote: shortQuote,
            delta: shortQuote.delta,
          },
          netDebit,
          maxLoss,
          maxGain,
          riskReward,
          liquidityScore,
          width,
        };
      }
    }

    if (!bestSpread) {
      throw new Error('No suitable spread found');
    }

    const dte = Math.floor((chain.expiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const breakeven = optionType === 'CALL'
      ? bestSpread.long.strike + bestSpread.netDebit
      : bestSpread.long.strike - bestSpread.netDebit;

    return {
      primary: {
        strike: bestSpread.long.strike,
        expiration: chain.expiration,
        optionType,
        quote: bestSpread.long.quote,
        delta: bestSpread.long.delta,
        dte,
        premium: bestSpread.long.quote.last,
        maxLoss: bestSpread.maxLoss,
        maxGain: bestSpread.maxGain,
        breakeven,
        riskReward: bestSpread.riskReward,
        liquidityScore: bestSpread.liquidityScore,
        selectionReason: `Debit spread: ${bestSpread.width.toFixed(0)} width, R:R ${bestSpread.riskReward.toFixed(2)}`,
      },
      secondary: {
        strike: bestSpread.short.strike,
        expiration: chain.expiration,
        optionType,
        quote: bestSpread.short.quote,
        delta: bestSpread.short.delta,
        dte,
        premium: bestSpread.short.quote.last,
        maxLoss: 0,
        maxGain: 0,
        breakeven: 0,
        riskReward: 0,
        liquidityScore: bestSpread.liquidityScore,
        selectionReason: 'Short leg of spread',
      },
      strategy: criteria.strategy,
      totalCost: bestSpread.netDebit,
      maxLoss: bestSpread.maxLoss,
      maxGain: bestSpread.maxGain,
      breakevens: [breakeven],
      riskReward: bestSpread.riskReward,
    };
  }

  /**
   * Select strikes for credit spread
   */
  private async selectCreditSpread(
    chain: OptionsChain,
    criteria: StrikeSelectionCriteria,
    timeframeConfig: any
  ): Promise<StrikeSelectionResult> {
    // Similar to debit spread but inverted
    // For credit spreads, sell higher strike, buy even higher (calls) or vice versa (puts)
    return this.selectDebitSpread(chain, criteria, timeframeConfig); // Simplified - would invert logic
  }

  private calculateExpiration(targetDTE: number): Date {
    return new Date(Date.now() + targetDTE * 24 * 60 * 60 * 1000);
  }

  private getTargetDelta(timeframe: TimeframeMode): number {
    const ranges: Record<TimeframeMode, [number, number]> = {
      INTRADAY: [0.40, 0.70],
      SWING: [0.30, 0.60],
      MONTHLY: [0.25, 0.55],
      LEAPS: [0.60, 0.85],
    };
    const [min, max] = ranges[timeframe];
    return (min + max) / 2; // Target middle of range
  }

  private getDeltaRange(timeframe: TimeframeMode): [number, number] {
    const ranges: Record<TimeframeMode, [number, number]> = {
      INTRADAY: [0.40, 0.70],
      SWING: [0.30, 0.60],
      MONTHLY: [0.25, 0.55],
      LEAPS: [0.60, 0.85],
    };
    return ranges[timeframe];
  }

  private getMinOI(timeframe: TimeframeMode): number {
    return timeframe === 'INTRADAY' ? 1000 : 500;
  }

  private getMinVolume(timeframe: TimeframeMode): number {
    return timeframe === 'INTRADAY' ? 200 : 50;
  }

  private getMaxSpread(timeframe: TimeframeMode): number {
    return timeframe === 'INTRADAY' ? 0.10 : 0.15; // 10-15% max spread
  }

  private calculateSpreadPercent(quote: OptionQuote): number {
    if (quote.bid === 0 || quote.ask === 0) return 1.0;
    const mid = (quote.bid + quote.ask) / 2;
    const spread = quote.ask - quote.bid;
    return spread / mid;
  }

  private calculateLiquidityScore(quote: OptionQuote): number {
    // Score based on volume and open interest
    const volumeScore = Math.min(1.0, quote.volume / 1000);
    const oiScore = Math.min(1.0, quote.openInterest / 5000);
    const spreadScore = 1.0 - Math.min(1.0, this.calculateSpreadPercent(quote) / 0.20);
    
    return (volumeScore * 0.4) + (oiScore * 0.4) + (spreadScore * 0.2);
  }
}

