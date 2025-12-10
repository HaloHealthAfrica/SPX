/**
 * Unified Signal Processor Service
 * Agent 6: Routes signals to appropriate processing path (auto-trade or manual)
 */

import { TradingViewSignal } from '../types';
import { GeneratedSignal } from './signal-generator.service';
import { AutoTradeOrchestrator } from './auto-trade.orchestrator';
import { runDecisionEngine } from '../decision-engine';
import { runOptionsDecisionEngine, OptionsDecisionInput } from '../options/decision-engine';
import { StrikeSelectorService } from './strike-selector.service';
import { MarketDataService } from './market-data.service';
import { classifyTimeframe, TimeframeMode } from '../options/timeframe';
import { selectStrategy } from '../options/strategy-selection';
import pool from '../db';

export interface ProcessedSignal {
  signal: TradingViewSignal | GeneratedSignal;
  isOptions: boolean;
  timeframe?: TimeframeMode;
  strikeSelection?: any;
  decision?: any;
  routedTo: 'auto-trade' | 'manual' | 'both';
}

export class SignalProcessorService {
  private autoTradeOrchestrator?: AutoTradeOrchestrator;
  private strikeSelector?: StrikeSelectorService;
  private marketData?: MarketDataService;

  constructor(
    autoTradeOrchestrator?: AutoTradeOrchestrator,
    strikeSelector?: StrikeSelectorService,
    marketData?: MarketDataService
  ) {
    this.autoTradeOrchestrator = autoTradeOrchestrator;
    this.strikeSelector = strikeSelector;
    this.marketData = marketData;
  }

  /**
   * Process signal from webhook or signal generator
   */
  async processSignal(
    signal: TradingViewSignal | GeneratedSignal,
    source: 'webhook' | 'auto-generated'
  ): Promise<ProcessedSignal> {
    // Detect if this is an options trade
    const isOptions = this.detectOptionsTrade(signal);
    
    // Classify timeframe
    const timeframe = classifyTimeframe(signal, undefined);
    
    // Select strike if options
    let strikeSelection = null;
    if (isOptions && this.strikeSelector && this.marketData) {
      try {
        const strategy = selectStrategy(
          signal.direction,
          'TREND', // Would get from decision engine
          timeframe,
          50, // IV rank - would fetch
          signal.confidence >= 7.0 ? 'HIGH' : signal.confidence >= 6.0 ? 'MEDIUM' : 'LOW'
        );
        
        strikeSelection = await this.strikeSelector.selectStrikes({
          underlyingPrice: signal.entry_price,
          direction: signal.direction,
          timeframe,
          strategy,
          minRR: timeframe === 'INTRADAY' ? 1.5 : timeframe === 'SWING' ? 2.0 : 2.5,
        });
      } catch (error) {
        console.error('[SignalProcessor] Error selecting strikes:', error);
      }
    }

    // Determine routing
    const autoTradeEnabled = await this.isAutoTradeEnabled();
    const shouldRouteToAutoTrade = autoTradeEnabled && 
                                   (source === 'auto-generated' || 
                                    (source === 'webhook' && await this.shouldRouteWebhookToAutoTrade()));

    // Process through decision engine
    let decision;
    if (isOptions && strikeSelection) {
      // Use options decision engine
      const optionsInput: OptionsDecisionInput = {
        ...signal,
        strike: strikeSelection.primary.strike,
        expiration: strikeSelection.primary.expiration,
        optionType: strikeSelection.primary.optionType,
        impliedVolatility: strikeSelection.primary.quote.impliedVolatility,
        ivRank: 50, // Would fetch
        greeks: {
          delta: strikeSelection.primary.delta,
          gamma: strikeSelection.primary.quote.gamma,
          theta: strikeSelection.primary.quote.theta,
          vega: strikeSelection.primary.quote.vega,
        },
        bidAskSpread: this.calculateSpread(strikeSelection.primary.quote),
        openInterest: strikeSelection.primary.quote.openInterest,
        volume: strikeSelection.primary.quote.volume,
        timeframe,
      };
      
      decision = runOptionsDecisionEngine(optionsInput, {
        strike: strikeSelection.primary.strike,
        expiration: strikeSelection.primary.expiration,
        optionType: strikeSelection.primary.optionType,
        currentPrice: strikeSelection.primary.premium,
        impliedVolatility: strikeSelection.primary.quote.impliedVolatility,
        ivRank: this.marketData ? await this.marketData.getIVRank(signal.symbol).catch(() => 50) : 50,
        ivPercentile: this.marketData ? await this.marketData.getIVPercentile(signal.symbol).catch(() => 50) : 50,
        greeks: {
          delta: strikeSelection.primary.delta,
          gamma: strikeSelection.primary.quote.gamma,
          theta: strikeSelection.primary.quote.theta,
          vega: strikeSelection.primary.quote.vega,
        },
        bidAskSpread: this.calculateSpread(strikeSelection.primary.quote),
        openInterest: strikeSelection.primary.quote.openInterest,
        volume: strikeSelection.primary.quote.volume,
      });
    } else {
      // Use directional decision engine
      decision = runDecisionEngine(signal);
    }

    // Route to auto-trade if enabled
    if (shouldRouteToAutoTrade && this.autoTradeOrchestrator) {
      // Convert to GeneratedSignal format for orchestrator
      const generatedSignal: GeneratedSignal = {
        id: `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        symbol: signal.symbol,
        timestamp: new Date(signal.timestamp * 1000),
        timeframe: signal.resolution || '1D',
        signal_type: signal.signal_type,
        direction: signal.direction,
        confidence: signal.confidence,
        confluence_count: signal.confluence_count,
        active_signals: signal.active_signals,
        entry_price: signal.entry_price,
        stop_loss: signal.stop_loss,
        take_profit_1: signal.take_profit_1,
        metadata: {
          pattern_data: {},
          market_context: {},
        },
      };
      
      // Emit to orchestrator
      this.autoTradeOrchestrator.emit('signal', generatedSignal);
    }

    return {
      signal,
      isOptions,
      timeframe,
      strikeSelection,
      decision,
      routedTo: shouldRouteToAutoTrade ? 'auto-trade' : 'manual',
    };
  }

  private detectOptionsTrade(signal: TradingViewSignal | GeneratedSignal): boolean {
    // Check if signal indicates options trading
    // Could check signal_type, symbol format, or explicit flag
    const symbol = signal.symbol;
    
    // SPX options typically have specific formats
    // For now, check if there's an explicit flag or symbol pattern
    if ('metadata' in signal && (signal as any).metadata?.isOptions) {
      return true;
    }
    
    // Check symbol pattern (SPX, SPXW, etc. are options-capable)
    const optionsSymbols = ['SPX', 'SPXW', 'SPY', 'QQQ', 'IWM'];
    if (optionsSymbols.includes(symbol)) {
      // Could be options - would need explicit flag or check signal type
      return false; // Default to false unless explicitly marked
    }
    
    return false;
  }

  private async isAutoTradeEnabled(): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT enabled FROM auto_trade_state ORDER BY updated_at DESC LIMIT 1'
      );
      return result.rows[0]?.enabled || false;
    } catch {
      return false;
    }
  }

  private async shouldRouteWebhookToAutoTrade(): Promise<boolean> {
    // Check if webhooks should be routed to auto-trade
    // Could be configurable setting
    try {
      const result = await pool.query(
        'SELECT config FROM auto_trade_state ORDER BY updated_at DESC LIMIT 1'
      );
      const config = result.rows[0]?.config;
      return config?.routeWebhooksToAutoTrade || false;
    } catch {
      return false;
    }
  }

  private calculateSpread(quote: any): number {
    if (!quote.bid || !quote.ask) return 0.05; // Default 5%
    const mid = (quote.bid + quote.ask) / 2;
    const spread = quote.ask - quote.bid;
    return spread / mid;
  }
}


