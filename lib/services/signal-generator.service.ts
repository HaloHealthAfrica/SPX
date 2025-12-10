/**
 * Signal Generator Service
 * Agent 3: Continuously analyzes market data and generates trading signals
 */

import { MarketDataService, OHLCV } from './market-data.service';
import { EventEmitter } from 'events';

export type SignalType = 
  | 'STRAT_212' | 'BOS' | 'MSS' | 'CHoCH'
  | 'SWEEP_LOW' | 'SWEEP_HIGH' | 'SMT'
  | 'FVG' | 'DISPLACEMENT' | 'BREAKER'
  | 'VOLUME_SURGE' | 'ORB';

export interface SignalGeneratorConfig {
  symbols: string[];
  timeframes: ('1m' | '5m' | '15m' | '1h' | '4h' | '1d')[];
  enabledSignals: SignalType[];
  minConfidence: number;
}

export interface SignalResult {
  signalType: SignalType;
  direction: 'LONG' | 'SHORT';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  patternData?: any;
}

export interface GeneratedSignal {
  id: string;
  symbol: string;
  timestamp: Date;
  timeframe: string;
  signal_type: SignalType;
  direction: 'LONG' | 'SHORT';
  confidence: number;
  confluence_count: number;
  active_signals: SignalType[];
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2?: number;
  take_profit_3?: number;
  metadata: {
    pattern_data: any;
    market_context: any;
    iv_rank?: number;
    vix?: number;
  };
}

export class SignalGeneratorService extends EventEmitter {
  private config: SignalGeneratorConfig;
  private marketData: MarketDataService;
  private isRunning: boolean = false;
  private candleCache: Map<string, OHLCV[]> = new Map();
  private analysisIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: SignalGeneratorConfig, marketData: MarketDataService) {
    super();
    this.config = config;
    this.marketData = marketData;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[SignalGeneratorService] Starting...');

    // Subscribe to market data for each symbol
    for (const symbol of this.config.symbols) {
      this.marketData.subscribe(symbol, (data) => {
        this.onMarketDataUpdate(symbol, data);
      });

      // Start analysis for each timeframe
      for (const timeframe of this.config.timeframes) {
        await this.startTimeframeAnalysis(symbol, timeframe);
      }
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Clear all intervals
    for (const interval of this.analysisIntervals.values()) {
      clearInterval(interval);
    }
    this.analysisIntervals.clear();
    
    // Unsubscribe from market data
    for (const symbol of this.config.symbols) {
      // Note: Would need to store callbacks to unsubscribe properly
    }
    
    console.log('[SignalGeneratorService] Stopped');
  }

  onSignal(callback: (signal: GeneratedSignal) => void): void {
    this.on('signal', callback);
  }

  private async startTimeframeAnalysis(symbol: string, timeframe: string): Promise<void> {
    const key = `${symbol}-${timeframe}`;
    
    // Initial analysis
    await this.analyzeTimeframe(symbol, timeframe);
    
    // Set up periodic analysis
    const interval = this.getTimeframeMs(timeframe);
    const timer = setInterval(() => {
      this.analyzeTimeframe(symbol, timeframe);
    }, interval);
    
    this.analysisIntervals.set(key, timer);
  }

  private async analyzeTimeframe(symbol: string, timeframe: string): Promise<void> {
    try {
      // Get historical candles
      const candles = await this.marketData.getOHLCV(symbol, timeframe, 100);
      this.candleCache.set(`${symbol}-${timeframe}`, candles);
      
      // Detect signals
      const signals: SignalResult[] = [];
      
      if (this.config.enabledSignals.includes('STRAT_212')) {
        const signal = this.detectSTRAT212(candles);
        if (signal) signals.push(signal);
      }
      
      if (this.config.enabledSignals.includes('BOS')) {
        const signal = this.detectBOS(candles);
        if (signal) signals.push(signal);
      }
      
      if (this.config.enabledSignals.includes('FVG')) {
        const signal = this.detectFVG(candles);
        if (signal) signals.push(signal);
      }
      
      if (this.config.enabledSignals.includes('SWEEP_LOW')) {
        const signal = this.detectSweep(candles, 'LOW');
        if (signal) signals.push(signal);
      }
      
      if (this.config.enabledSignals.includes('SWEEP_HIGH')) {
        const signal = this.detectSweep(candles, 'HIGH');
        if (signal) signals.push(signal);
      }
      
      if (this.config.enabledSignals.includes('DISPLACEMENT')) {
        const signal = this.detectDisplacement(candles);
        if (signal) signals.push(signal);
      }
      
      // Calculate confluence and generate final signal
      if (signals.length > 0) {
        const finalSignal = await this.calculateConfluence(signals, symbol, timeframe, candles);
        if (finalSignal && finalSignal.confidence >= this.config.minConfidence) {
          this.emit('signal', finalSignal);
        }
      }
    } catch (error) {
      console.error(`[SignalGeneratorService] Error analyzing ${symbol} ${timeframe}:`, error);
    }
  }

  private onMarketDataUpdate(symbol: string, data: OHLCV): void {
    // Update cache and trigger re-analysis if needed
    // This is a simplified version - in production, would update specific timeframe cache
  }

  // Signal Detection Methods

  private detectSTRAT212(candles: OHLCV[]): SignalResult | null {
    if (candles.length < 3) return null;
    
    const recent = candles.slice(-3);
    const [c1, c2, c3] = recent;
    
    // Simplified STRAT_212 detection: 3-candle pattern
    // Look for: down, up, down (or up, down, up)
    const pattern1 = c1.close < c1.open && c2.close > c2.open && c3.close < c3.open;
    const pattern2 = c1.close > c1.open && c2.close < c2.open && c3.close > c3.open;
    
    if (pattern1) {
      const entry = c3.close;
      const stopLoss = Math.min(c1.low, c3.low);
      const takeProfit = entry + (entry - stopLoss) * 2;
      
      return {
        signalType: 'STRAT_212',
        direction: 'LONG',
        confidence: 6.5,
        entryPrice: entry,
        stopLoss,
        takeProfit1: takeProfit,
      };
    }
    
    if (pattern2) {
      const entry = c3.close;
      const stopLoss = Math.max(c1.high, c3.high);
      const takeProfit = entry - (stopLoss - entry) * 2;
      
      return {
        signalType: 'STRAT_212',
        direction: 'SHORT',
        confidence: 6.5,
        entryPrice: entry,
        stopLoss,
        takeProfit1: takeProfit,
      };
    }
    
    return null;
  }

  private detectBOS(candles: OHLCV[]): SignalResult | null {
    if (candles.length < 5) return null;
    
    // Break of Structure: price breaks previous swing high/low
    const recent = candles.slice(-5);
    const swingHigh = Math.max(...recent.slice(0, -1).map(c => c.high));
    const swingLow = Math.min(...recent.slice(0, -1).map(c => c.low));
    const current = recent[recent.length - 1];
    
    if (current.close > swingHigh) {
      return {
        signalType: 'BOS',
        direction: 'LONG',
        confidence: 7.0,
        entryPrice: current.close,
        stopLoss: swingHigh * 0.995,
        takeProfit1: current.close + (current.close - swingHigh) * 2,
      };
    }
    
    if (current.close < swingLow) {
      return {
        signalType: 'BOS',
        direction: 'SHORT',
        confidence: 7.0,
        entryPrice: current.close,
        stopLoss: swingLow * 1.005,
        takeProfit1: current.close - (swingLow - current.close) * 2,
      };
    }
    
    return null;
  }

  private detectFVG(candles: OHLCV[]): SignalResult | null {
    if (candles.length < 3) return null;
    
    const recent = candles.slice(-3);
    const [c1, c2, c3] = recent;
    
    // Fair Value Gap: gap between candle 1 and 3, with candle 2 not filling it
    const gapUp = c3.low > c1.high;
    const gapDown = c3.high < c1.low;
    
    if (gapUp && c2.low > c1.high) {
      const entry = c3.close;
      const stopLoss = c1.high;
      const takeProfit = entry + (entry - stopLoss) * 2;
      
      return {
        signalType: 'FVG',
        direction: 'LONG',
        confidence: 7.5,
        entryPrice: entry,
        stopLoss,
        takeProfit1: takeProfit,
      };
    }
    
    if (gapDown && c2.high < c1.low) {
      const entry = c3.close;
      const stopLoss = c1.low;
      const takeProfit = entry - (stopLoss - entry) * 2;
      
      return {
        signalType: 'FVG',
        direction: 'SHORT',
        confidence: 7.5,
        entryPrice: entry,
        stopLoss,
        takeProfit1: takeProfit,
      };
    }
    
    return null;
  }

  private detectSweep(candles: OHLCV[], type: 'LOW' | 'HIGH'): SignalResult | null {
    if (candles.length < 5) return null;
    
    const recent = candles.slice(-5);
    const levels = recent.slice(0, -1).map(c => type === 'LOW' ? c.low : c.high);
    const level = type === 'LOW' ? Math.min(...levels) : Math.max(...levels);
    const current = recent[recent.length - 1];
    
    // Sweep: price briefly breaks level then reverses
    const swept = type === 'LOW' 
      ? current.low < level && current.close > level
      : current.high > level && current.close < level;
    
    if (swept) {
      const entry = current.close;
      const stopLoss = type === 'LOW' ? level * 0.995 : level * 1.005;
      const takeProfit = type === 'LOW'
        ? entry + (entry - stopLoss) * 2
        : entry - (stopLoss - entry) * 2;
      
      return {
        signalType: type === 'LOW' ? 'SWEEP_LOW' : 'SWEEP_HIGH',
        direction: type === 'LOW' ? 'LONG' : 'SHORT',
        confidence: 7.0,
        entryPrice: entry,
        stopLoss,
        takeProfit1: takeProfit,
      };
    }
    
    return null;
  }

  private detectDisplacement(candles: OHLCV[]): SignalResult | null {
    if (candles.length < 3) return null;
    
    const recent = candles.slice(-3);
    const [c1, c2, c3] = recent;
    
    // Displacement: strong move with volume
    const move1 = Math.abs(c2.close - c1.close) / c1.close;
    const move2 = Math.abs(c3.close - c2.close) / c2.close;
    
    if (move2 > move1 * 1.5 && c3.volume > c1.volume * 1.2) {
      const direction = c3.close > c2.close ? 'LONG' : 'SHORT';
      const entry = c3.close;
      const stopLoss = direction === 'LONG' ? c2.low : c2.high;
      const takeProfit = direction === 'LONG'
        ? entry + (entry - stopLoss) * 2
        : entry - (stopLoss - entry) * 2;
      
      return {
        signalType: 'DISPLACEMENT',
        direction,
        confidence: 7.5,
        entryPrice: entry,
        stopLoss,
        takeProfit1: takeProfit,
      };
    }
    
    return null;
  }

  private async calculateConfluence(
    signals: SignalResult[],
    symbol: string,
    timeframe: string,
    candles: OHLCV[]
  ): Promise<GeneratedSignal | null> {
    if (signals.length === 0) return null;
    
    // Group by direction
    const longSignals = signals.filter(s => s.direction === 'LONG');
    const shortSignals = signals.filter(s => s.direction === 'SHORT');
    
    if (longSignals.length === 0 && shortSignals.length === 0) return null;
    
    // Use the direction with more signals
    const dominantSignals = longSignals.length >= shortSignals.length ? longSignals : shortSignals;
    const direction = longSignals.length >= shortSignals.length ? 'LONG' : 'SHORT';
    
    // Calculate average entry, stop, and target
    const avgEntry = dominantSignals.reduce((sum, s) => sum + s.entryPrice, 0) / dominantSignals.length;
    const avgStop = dominantSignals.reduce((sum, s) => sum + s.stopLoss, 0) / dominantSignals.length;
    const avgTarget = dominantSignals.reduce((sum, s) => sum + s.takeProfit1, 0) / dominantSignals.length;
    
    // Calculate confidence based on confluence
    const baseConfidence = dominantSignals.reduce((sum, s) => sum + s.confidence, 0) / dominantSignals.length;
    const confluenceBonus = Math.min(2.0, dominantSignals.length * 0.5);
    const totalConfidence = Math.min(10.0, baseConfidence + confluenceBonus);
    
    // Get VIX if available (await properly)
    let vix: number | undefined;
    try {
      vix = await this.marketData.getVIX();
    } catch (error) {
      console.warn('[SignalGenerator] Failed to get VIX, continuing without it');
      // Continue without VIX - it's optional
    }
    
    return {
      id: `${symbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      timestamp: new Date(),
      timeframe,
      signal_type: dominantSignals[0].signalType,
      direction,
      confidence: totalConfidence,
      confluence_count: dominantSignals.length,
      active_signals: dominantSignals.map(s => s.signalType),
      entry_price: avgEntry,
      stop_loss: avgStop,
      take_profit_1: avgTarget,
      metadata: {
        pattern_data: dominantSignals.map(s => s.patternData),
        market_context: {
          currentPrice: candles[candles.length - 1].close,
          volume: candles[candles.length - 1].volume,
        },
        vix,
      },
    };
  }

  private getTimeframeMs(timeframe: string): number {
    const multipliers: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };
    return multipliers[timeframe] || 60 * 1000;
  }
}


