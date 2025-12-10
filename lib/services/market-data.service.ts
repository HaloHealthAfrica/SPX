/**
 * Market Data Service
 * Agent 2: Real-time market data fetching and normalization
 */

import { 
  getMarketPrice, 
  getOptionsChain, 
  getOHLCV, 
  getVIX, 
  getIVRank,
  getIVPercentile,
  getOptionsFlow,
  getMarketBreadth,
  OptionsChain, 
  OHLCV,
  OptionQuote,
  OptionsFlow,
  MarketBreadth
} from '../market-data';

// Re-export types for convenience
export type { OHLCV, OptionsChain, OptionQuote, OptionsFlow, MarketBreadth };

export interface MarketDataConfig {
  symbols: string[];
  dataSource: 'polygon' | 'alpaca' | 'tradier' | 'ibkr' | 'mock';
  pollInterval: number; // milliseconds
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export class MarketDataService {
  private subscribers: Map<string, Set<(data: OHLCV) => void>> = new Map();
  private optionsCache: Map<string, OptionsChain> = new Map();
  private config: MarketDataConfig;
  private isRunning: boolean = false;
  private pollInterval?: NodeJS.Timeout;
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();

  constructor(config: MarketDataConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[MarketDataService] Starting...');
    
    // Start polling for subscribed symbols
    this.pollInterval = setInterval(() => {
      this.pollPrices();
    }, this.config.pollInterval);
    
    // Initial poll
    await this.pollPrices();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    console.log('[MarketDataService] Stopped');
  }

  subscribe(symbol: string, callback: (data: OHLCV) => void): void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol)!.add(callback);
  }

  unsubscribe(symbol: string, callback: (data: OHLCV) => void): void {
    const callbacks = this.subscribers.get(symbol);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscribers.delete(symbol);
      }
    }
  }

  async getLatestPrice(symbol: string): Promise<number> {
    // Check cache first
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < 5000) {
      return cached.price;
    }

    try {
      const price = await getMarketPrice(symbol);
      this.priceCache.set(symbol, { price, timestamp: Date.now() });
      return price;
    } catch (error) {
      console.error(`[MarketDataService] Error fetching price for ${symbol}:`, error);
      // Return cached price if available, even if stale
      if (cached) return cached.price;
      throw error;
    }
  }

  async getOHLCV(symbol: string, timeframe: string, limit: number): Promise<OHLCV[]> {
    try {
      // Use real provider (TwelveData, Alpaca, or fallback)
      return await getOHLCV(symbol, timeframe, limit);
    } catch (error: any) {
      console.error(`[MarketDataService] Failed to get OHLCV for ${symbol}, using fallback:`, error.message);
      
      // Fallback to mock if real provider fails
      const now = Date.now();
      const interval = this.getTimeframeMs(timeframe);
      const data: OHLCV[] = [];
      const latestPrice = await this.getLatestPrice(symbol);
      
      for (let i = limit - 1; i >= 0; i--) {
        const timestamp = now - (i * interval);
        const variation = (Math.random() - 0.5) * latestPrice * 0.02;
        const open = latestPrice + variation;
        const close = open + (Math.random() - 0.5) * latestPrice * 0.01;
        const high = Math.max(open, close) + Math.random() * latestPrice * 0.005;
        const low = Math.min(open, close) - Math.random() * latestPrice * 0.005;
        
        data.push({
          symbol,
          timestamp,
          open,
          high,
          low,
          close,
          volume: Math.floor(Math.random() * 1000000),
        });
      }
      
      return data;
    }
  }

  async getOptionsChain(symbol: string, expiration?: Date): Promise<OptionsChain> {
    const cacheKey = `${symbol}-${expiration?.toISOString() || 'all'}`;
    
    // Check cache (5 minute TTL)
    const cached = this.optionsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Use real provider (Tradier, MarketData.app, or fallback)
      const chain = await getOptionsChain(symbol, expiration);
      
      // Cache for 5 minutes
      this.optionsCache.set(cacheKey, chain);
      setTimeout(() => this.optionsCache.delete(cacheKey), 5 * 60 * 1000);
      
      return chain;
    } catch (error: any) {
      console.error(`[MarketDataService] Failed to get options chain for ${symbol}, using fallback:`, error.message);
      
      // Fallback to mock if real provider fails
      const chain: OptionsChain = {
        symbol,
        expiration: expiration || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        strikes: [],
      };

      const underlyingPrice = await this.getLatestPrice(symbol);
      const strikes = this.generateStrikes(underlyingPrice, 20);

      for (const strike of strikes) {
        const call = this.generateOptionQuote('CALL', underlyingPrice, strike);
        const put = this.generateOptionQuote('PUT', underlyingPrice, strike);
        
        chain.strikes.push({ strike, call: call as OptionQuote, put: put as OptionQuote });
      }

      this.optionsCache.set(cacheKey, chain);
      return chain;
    }
  }

  async getVIX(): Promise<number> {
    try {
      // Use real VIX provider (TwelveData, Tradier, Alpaca, or fallback)
      return await getVIX();
    } catch (error: any) {
      console.error('[MarketDataService] Failed to get VIX, using fallback:', error.message);
      // Fallback to mock VIX
      return 15 + Math.random() * 10; // 15-25 range
    }
  }

  async getIVRank(symbol: string): Promise<number> {
    try {
      // Use real IV rank provider (Tradier or fallback)
      return await getIVRank(symbol);
    } catch (error: any) {
      console.error(`[MarketDataService] Failed to get IV rank for ${symbol}, using default:`, error.message);
      // Default to 50 (middle)
      return 50;
    }
  }

  async getIVPercentile(symbol: string): Promise<number> {
    try {
      // Use real IV percentile provider (Tradier or fallback)
      return await getIVPercentile(symbol);
    } catch (error: any) {
      console.error(`[MarketDataService] Failed to get IV percentile for ${symbol}, using default:`, error.message);
      // Default to 50 (middle)
      return 50;
    }
  }

  async getOptionsFlow(symbol: string): Promise<OptionsFlow> {
    try {
      // Use MarketData.app for options flow
      return await getOptionsFlow(symbol);
    } catch (error: any) {
      console.error(`[MarketDataService] Failed to get options flow for ${symbol}:`, error.message);
      // Return empty flow on error
      return {
        symbol,
        timestamp: new Date(),
        unusualActivity: [],
        totalCallVolume: 0,
        totalPutVolume: 0,
        putCallRatio: 0,
      };
    }
  }

  async getMarketBreadth(): Promise<MarketBreadth> {
    try {
      // Use MarketData.app for market breadth
      return await getMarketBreadth();
    } catch (error: any) {
      console.error(`[MarketDataService] Failed to get market breadth:`, error.message);
      // Return neutral breadth on error
      return {
        timestamp: new Date(),
        advanceDecline: {
          advancing: 0,
          declining: 0,
          unchanged: 0,
          ratio: 1.0,
        },
        newHighsLows: {
          newHighs: 0,
          newLows: 0,
          ratio: 1.0,
        },
        volume: {
          upVolume: 0,
          downVolume: 0,
          ratio: 1.0,
        },
        vix: 0,
        putCallRatio: 0,
        sentiment: 'NEUTRAL',
      };
    }
  }

  async calculateGreeks(
    optionType: 'CALL' | 'PUT',
    underlyingPrice: number,
    strike: number,
    expiration: Date,
    iv: number,
    riskFreeRate: number = 0.05
  ): Promise<Greeks> {
    // Simplified Black-Scholes Greeks calculation
    // In production, use a proper options pricing library
    
    const timeToExpiry = (expiration.getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000);
    const d1 = (Math.log(underlyingPrice / strike) + (riskFreeRate + 0.5 * iv * iv) * timeToExpiry) / (iv * Math.sqrt(timeToExpiry));
    const d2 = d1 - iv * Math.sqrt(timeToExpiry);
    
    // Delta
    const delta = optionType === 'CALL' 
      ? this.normalCDF(d1)
      : this.normalCDF(d1) - 1;
    
    // Gamma (same for calls and puts)
    const gamma = this.normalPDF(d1) / (underlyingPrice * iv * Math.sqrt(timeToExpiry));
    
    // Theta
    const theta = -(underlyingPrice * this.normalPDF(d1) * iv) / (2 * Math.sqrt(timeToExpiry))
      - riskFreeRate * strike * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(optionType === 'CALL' ? d2 : -d2);
    const thetaPerDay = theta / 365;
    
    // Vega (same for calls and puts)
    const vega = underlyingPrice * this.normalPDF(d1) * Math.sqrt(timeToExpiry) / 100; // per 1% IV change
    
    return {
      delta,
      gamma,
      theta: thetaPerDay,
      vega,
    };
  }

  private async pollPrices(): Promise<void> {
    for (const symbol of this.config.symbols) {
      try {
        const price = await this.getLatestPrice(symbol);
        const ohlcv: OHLCV = {
          symbol,
          timestamp: Date.now(),
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 0,
        };

        // Notify subscribers
        const callbacks = this.subscribers.get(symbol);
        if (callbacks) {
          callbacks.forEach(callback => {
            try {
              callback(ohlcv);
            } catch (error) {
              console.error(`[MarketDataService] Error in subscriber callback:`, error);
            }
          });
        }
      } catch (error) {
        console.error(`[MarketDataService] Error polling ${symbol}:`, error);
      }
    }
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

  private generateStrikes(underlyingPrice: number, count: number): number[] {
    const strikes: number[] = [];
    const step = underlyingPrice * 0.05; // 5% steps
    const start = underlyingPrice - (count / 2) * step;
    
    for (let i = 0; i < count; i++) {
      strikes.push(Math.round((start + i * step) / 5) * 5); // Round to nearest $5
    }
    
    return strikes;
  }

  private generateOptionQuote(
    type: 'CALL' | 'PUT',
    underlyingPrice: number,
    strike: number
  ): OptionQuote {
    const intrinsic = type === 'CALL' 
      ? Math.max(0, underlyingPrice - strike)
      : Math.max(0, strike - underlyingPrice);
    const timeValue = Math.max(0.5, (Math.abs(underlyingPrice - strike) / underlyingPrice) * 10);
    const midPrice = intrinsic + timeValue;
    
    const spread = midPrice * 0.05; // 5% spread
    const bid = midPrice - spread / 2;
    const ask = midPrice + spread / 2;
    
    // Mock Greeks
    const moneyness = underlyingPrice / strike;
    const delta = type === 'CALL'
      ? Math.max(0, Math.min(1, moneyness - 0.5))
      : Math.max(-1, Math.min(0, 0.5 - moneyness));
    
    return {
      bid,
      ask,
      last: midPrice,
      volume: Math.floor(Math.random() * 1000),
      openInterest: Math.floor(Math.random() * 5000),
      impliedVolatility: 0.20 + Math.random() * 0.10, // 20-30% IV
      delta,
      gamma: 0.01,
      theta: -0.05,
      vega: 0.1,
    };
  }

  // Normal CDF approximation
  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  // Normal PDF
  private normalPDF(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  // Error function approximation
  private erf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }
}

