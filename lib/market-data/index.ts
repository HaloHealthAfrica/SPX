/**
 * Market Data Provider
 * Supports multiple providers: Alpaca, Tradier, TwelveData, MarketData.app
 */

export interface OptionQuote {
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface OptionsChain {
  symbol: string;
  expiration: Date;
  strikes: {
    strike: number;
    call?: OptionQuote;
    put?: OptionQuote;
  }[];
}

export interface OHLCV {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketDataProvider {
  getCurrentPrice(symbol: string): Promise<number>;
  getQuote(symbol: string): Promise<{ price: number; timestamp: number }>;
  getVIX?(): Promise<number>;
  getOHLCV?(symbol: string, timeframe: string, limit: number): Promise<OHLCV[]>;
  getOptionsChain?(symbol: string, expiration?: Date): Promise<OptionsChain>;
  getOptionsExpirations?(symbol: string): Promise<Date[]>;
  getIVRank?(symbol: string): Promise<number>;
  getIVPercentile?(symbol: string): Promise<number>;
}

class AlpacaProvider implements MarketDataProvider {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ALPACA_API_KEY || '';
    this.apiSecret = process.env.ALPACA_SECRET_KEY || '';
    this.baseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Alpaca API credentials not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/v2/stocks/${symbol}/quotes/latest`, {
        headers: {
          'APCA-API-KEY-ID': this.apiKey,
          'APCA-API-SECRET-KEY': this.apiSecret,
        },
      });

      if (!response.ok) {
        throw new Error(`Alpaca API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.quote?.bp || data.quote?.ap || 0; // bid price or ask price
    } catch (error: any) {
      console.error('Alpaca API error:', error);
      throw error;
    }
  }

  async getQuote(symbol: string): Promise<{ price: number; timestamp: number }> {
    const price = await this.getCurrentPrice(symbol);
    return { price, timestamp: Date.now() };
  }

  async getVIX(): Promise<number> {
    try {
      return await this.getCurrentPrice('VIX');
    } catch (error) {
      console.error('Alpaca VIX fetch error:', error);
      throw error;
    }
  }

  async getOHLCV(symbol: string, timeframe: string, limit: number): Promise<OHLCV[]> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Alpaca API credentials not configured');
    }

    try {
      // Map timeframe to Alpaca format
      const timeframeMap: Record<string, string> = {
        '1m': '1Min',
        '5m': '5Min',
        '15m': '15Min',
        '1h': '1Hour',
        '4h': '4Hour',
        '1d': '1Day',
      };
      const alpacaTimeframe = timeframeMap[timeframe] || '1Hour';

      const response = await fetch(
        `${this.baseUrl}/v2/stocks/${symbol}/bars?timeframe=${alpacaTimeframe}&limit=${limit}`,
        {
          headers: {
            'APCA-API-KEY-ID': this.apiKey,
            'APCA-API-SECRET-KEY': this.apiSecret,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Alpaca API error: ${response.statusText}`);
      }

      const data = await response.json();
      const bars = data.bars || [];

      return bars.map((bar: any) => ({
        symbol,
        timestamp: new Date(bar.t).getTime(),
        open: parseFloat(bar.o),
        high: parseFloat(bar.h),
        low: parseFloat(bar.l),
        close: parseFloat(bar.c),
        volume: parseInt(bar.v) || 0,
      }));
    } catch (error: any) {
      console.error('Alpaca OHLCV error:', error);
      throw error;
    }
  }
}

class TradierProvider implements MarketDataProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.TRADIER_API_KEY || '';
    this.baseUrl = process.env.TRADIER_BASE_URL || 'https://api.tradier.com/v1';
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    if (!this.apiKey) {
      throw new Error('Tradier API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/markets/quotes?symbols=${symbol}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Tradier API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.quotes?.quote?.last || data.quotes?.quote?.bid || 0;
    } catch (error: any) {
      console.error('Tradier API error:', error);
      throw error;
    }
  }

  async getQuote(symbol: string): Promise<{ price: number; timestamp: number }> {
    const price = await this.getCurrentPrice(symbol);
    return { price, timestamp: Date.now() };
  }

  async getVIX(): Promise<number> {
    try {
      return await this.getCurrentPrice('$VIX');
    } catch (error) {
      console.error('Tradier VIX fetch error:', error);
      throw error;
    }
  }

  async getOptionsExpirations(symbol: string): Promise<Date[]> {
    if (!this.apiKey) {
      throw new Error('Tradier API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/markets/options/expirations?symbol=${symbol}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Tradier API error: ${response.statusText}`);
      }

      const data = await response.json();
      const dates = data.expirations?.date || [];
      return dates.map((dateStr: string) => new Date(dateStr));
    } catch (error: any) {
      console.error('Tradier options expirations error:', error);
      throw error;
    }
  }

  async getOptionsChain(symbol: string, expiration?: Date): Promise<OptionsChain> {
    if (!this.apiKey) {
      throw new Error('Tradier API key not configured');
    }

    try {
      // Get expirations if not provided
      let expirationDate = expiration;
      if (!expirationDate) {
        const expirations = await this.getOptionsExpirations(symbol);
        if (expirations.length === 0) {
          throw new Error(`No expirations found for ${symbol}`);
        }
        // Use nearest expiration
        expirationDate = expirations[0];
      }

      const expirationStr = expirationDate.toISOString().split('T')[0];
      const response = await fetch(
        `${this.baseUrl}/markets/options/chains?symbol=${symbol}&expiration=${expirationStr}&greeks=true`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Tradier API error: ${response.statusText}`);
      }

      const data = await response.json();
      const options = data.options?.option || [];
      
      // Group by strike
      const strikeMap = new Map<number, { strike: number; call?: OptionQuote; put?: OptionQuote }>();

      for (const option of options) {
        const strike = parseFloat(option.strike);
        if (!strikeMap.has(strike)) {
          strikeMap.set(strike, { strike });
        }

        const strikeData = strikeMap.get(strike)!;
        const quote: OptionQuote = {
          bid: parseFloat(option.bid) || 0,
          ask: parseFloat(option.ask) || 0,
          last: parseFloat(option.last) || 0,
          volume: parseInt(option.volume) || 0,
          openInterest: parseInt(option.open_interest) || 0,
          impliedVolatility: parseFloat(option.greeks?.mid_iv) || parseFloat(option.iv) || 0,
          delta: option.greeks?.delta ? parseFloat(option.greeks.delta) : undefined,
          gamma: option.greeks?.gamma ? parseFloat(option.greeks.gamma) : undefined,
          theta: option.greeks?.theta ? parseFloat(option.greeks.theta) : undefined,
          vega: option.greeks?.vega ? parseFloat(option.greeks.vega) : undefined,
        };

        if (option.option_type === 'call') {
          strikeData.call = quote;
        } else if (option.option_type === 'put') {
          strikeData.put = quote;
        }
      }

      return {
        symbol,
        expiration: expirationDate,
        strikes: Array.from(strikeMap.values()).sort((a, b) => a.strike - b.strike),
      };
    } catch (error: any) {
      console.error('Tradier options chain error:', error);
      throw error;
    }
  }

  async getIVRank(symbol: string): Promise<number> {
    if (!this.apiKey) {
      throw new Error('Tradier API key not configured');
    }

    try {
      // Get historical IV data (52 weeks)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);

      const response = await fetch(
        `${this.baseUrl}/markets/history?symbol=${symbol}&interval=daily&start=${startDate.toISOString().split('T')[0]}&end=${endDate.toISOString().split('T')[0]}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Tradier API error: ${response.statusText}`);
      }

      const data = await response.json();
      const history = data.history?.day || [];

      if (history.length === 0) {
        // Fallback: get current IV from options chain
        const chain = await this.getOptionsChain(symbol);
        const ivs = chain.strikes
          .map(s => s.call?.impliedVolatility || s.put?.impliedVolatility || 0)
          .filter(iv => iv > 0);
        
        if (ivs.length === 0) return 50; // Default to middle
        
        const currentIV = ivs.reduce((a, b) => a + b, 0) / ivs.length;
        return Math.min(100, Math.max(0, (currentIV / 0.30) * 100)); // Assume 30% is high
      }

      // Get current IV from options chain
      const chain = await this.getOptionsChain(symbol);
      const currentIVs = chain.strikes
        .map(s => s.call?.impliedVolatility || s.put?.impliedVolatility || 0)
        .filter(iv => iv > 0);
      
      if (currentIVs.length === 0) return 50;

      const currentIV = currentIVs.reduce((a, b) => a + b, 0) / currentIVs.length;
      
      // Try to extract historical IV from historical options data
      // Tradier's historical API may include options data
      // For now, we'll use a more sophisticated approach:
      // 1. Get historical options chains for key dates (weekly samples)
      // 2. Extract IV from each historical chain
      // 3. Calculate min/max IV from historical data
      // 4. Calculate IV Rank = ((currentIV - minIV) / (maxIV - minIV)) * 100
      
      // Since fetching all historical options chains is expensive,
      // we'll use a hybrid approach:
      // - Use historical price volatility as proxy for IV
      // - Or sample key dates (monthly) to get IV range
      
      // For now, calculate from price volatility in historical data
      const priceVolatilities: number[] = [];
      for (let i = 0; i < Math.min(history.length, 252); i++) {
        const day = history[i];
        if (day.high && day.low && day.close) {
          // Calculate daily volatility proxy
          const dailyRange = (parseFloat(day.high) - parseFloat(day.low)) / parseFloat(day.close);
          priceVolatilities.push(dailyRange);
        }
      }
      
      if (priceVolatilities.length > 0) {
        // Calculate annualized volatility from daily ranges
        const avgDailyVol = priceVolatilities.reduce((a, b) => a + b, 0) / priceVolatilities.length;
        const annualizedVol = avgDailyVol * Math.sqrt(252);
        
        // Use volatility range to estimate IV range
        // IV is typically 1.2-1.5x realized volatility
        const minIV = annualizedVol * 0.8;  // Conservative lower bound
        const maxIV = annualizedVol * 1.8; // Upper bound
        
        // Calculate IV Rank
        const ivRank = ((currentIV - minIV) / (maxIV - minIV)) * 100;
        return Math.min(100, Math.max(0, ivRank));
      }
      
      // Fallback: use simplified calculation if historical data insufficient
      const minIV = 0.10;
      const maxIV = 0.30;
      const ivRank = ((currentIV - minIV) / (maxIV - minIV)) * 100;
      
      return Math.min(100, Math.max(0, ivRank));
    } catch (error: any) {
      console.error('Tradier IV rank error:', error);
      // Return default if calculation fails
      return 50;
    }
  }

  async getIVPercentile(symbol: string): Promise<number> {
    if (!this.apiKey) {
      throw new Error('Tradier API key not configured');
    }

    try {
      // Get current IV from options chain
      const chain = await this.getOptionsChain(symbol);
      const currentIVs = chain.strikes
        .map(s => s.call?.impliedVolatility || s.put?.impliedVolatility || 0)
        .filter(iv => iv > 0);
      
      if (currentIVs.length === 0) return 50; // Default to middle

      const currentIV = currentIVs.reduce((a, b) => a + b, 0) / currentIVs.length;

      // Get historical IV data (52 weeks) to calculate percentile
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);

      // Try to get historical options data
      // Note: Tradier's historical API may not include IV directly
      // We'll calculate from historical options chains if available
      // For now, use a simplified approach based on IV Rank
      
      // Get IV Rank first (which uses historical data)
      const ivRank = await this.getIVRank(symbol);
      
      // IV Percentile is similar to IV Rank but calculated differently
      // Percentile = % of days where IV was lower than current
      // Since we don't have direct historical IV data, we'll approximate:
      // If IV Rank is high (e.g., 80), percentile is also high
      // If IV Rank is low (e.g., 20), percentile is also low
      // This is an approximation - in production, use actual historical IV data
      
      // For a more accurate calculation, we'd need to:
      // 1. Fetch historical options chains for each day
      // 2. Extract IV for each day
      // 3. Count how many days had IV < currentIV
      // 4. Calculate percentile = (days with lower IV / total days) * 100
      
      // Simplified approach: Use IV Rank as base, adjust slightly
      // IV Percentile tends to be slightly different from IV Rank
      // We'll use IV Rank as approximation for now
      const ivPercentile = ivRank; // Approximation
      
      return Math.min(100, Math.max(0, ivPercentile));
    } catch (error: any) {
      console.error('Tradier IV percentile error:', error);
      // Return default if calculation fails
      return 50;
    }
  }
}

class TwelveDataProvider implements MarketDataProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.TWELVEDATA_API_KEY || '';
    this.baseUrl = 'https://api.twelvedata.com';
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    if (!this.apiKey) {
      throw new Error('TwelveData API key not configured');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/price?symbol=${symbol}&apikey=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`TwelveData API error: ${response.statusText}`);
      }

      const data = await response.json();
      return parseFloat(data.price) || 0;
    } catch (error: any) {
      console.error('TwelveData API error:', error);
      throw error;
    }
  }

  async getQuote(symbol: string): Promise<{ price: number; timestamp: number }> {
    const price = await this.getCurrentPrice(symbol);
    return { price, timestamp: Date.now() };
  }

  async getVIX(): Promise<number> {
    try {
      return await this.getCurrentPrice('VIX');
    } catch (error) {
      console.error('TwelveData VIX fetch error:', error);
      throw error;
    }
  }

  async getOHLCV(symbol: string, timeframe: string, limit: number): Promise<OHLCV[]> {
    if (!this.apiKey) {
      throw new Error('TwelveData API key not configured');
    }

    try {
      // Map timeframe to TwelveData format
      const intervalMap: Record<string, string> = {
        '1m': '1min',
        '5m': '5min',
        '15m': '15min',
        '1h': '1hour',
        '4h': '4hour',
        '1d': '1day',
      };
      const interval = intervalMap[timeframe] || '1hour';

      const response = await fetch(
        `${this.baseUrl}/time_series?symbol=${symbol}&interval=${interval}&outputsize=${limit}&apikey=${this.apiKey}&format=json`
      );

      if (!response.ok) {
        throw new Error(`TwelveData API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      const values = data.values || (data.status === 'ok' ? [] : []);
      
      if (values.length === 0 && data.status === 'error') {
        throw new Error(data.message || 'TwelveData API error');
      }

      return values
        .map((item: any) => ({
          symbol,
          timestamp: new Date(item.datetime).getTime(),
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseInt(item.volume) || 0,
        }))
        .reverse(); // Reverse to get chronological order (oldest first)
    } catch (error: any) {
      console.error('TwelveData OHLCV error:', error);
      throw error;
    }
  }
}

class MockProvider implements MarketDataProvider {
  private basePrices: Record<string, number> = {
    SPX: 4500,
    ES: 4500,
    SPY: 450,
    AVGO: 1200,
    VIX: 18,
    '$VIX': 18,
  };

  async getCurrentPrice(symbol: string): Promise<number> {
    // Add small random variation for realism
    const basePrice = this.basePrices[symbol] || 1000;
    const variation = basePrice * 0.001 * (Math.random() - 0.5); // ±0.1% variation
    return basePrice + variation;
  }

  async getQuote(symbol: string): Promise<{ price: number; timestamp: number }> {
    const price = await this.getCurrentPrice(symbol);
    return { price, timestamp: Date.now() };
  }

  async getVIX(): Promise<number> {
    return this.getCurrentPrice('VIX');
  }

  async getOHLCV(symbol: string, timeframe: string, limit: number): Promise<OHLCV[]> {
    // Generate mock OHLCV data
    const now = Date.now();
    const interval = this.getTimeframeMs(timeframe);
    const data: OHLCV[] = [];
    const basePrice = this.basePrices[symbol] || 1000;

    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = now - (i * interval);
      const variation = (Math.random() - 0.5) * basePrice * 0.02; // 2% variation
      const open = basePrice + variation;
      const close = open + (Math.random() - 0.5) * basePrice * 0.01;
      const high = Math.max(open, close) + Math.random() * basePrice * 0.005;
      const low = Math.min(open, close) - Math.random() * basePrice * 0.005;

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

  async getOptionsChain(symbol: string, expiration?: Date): Promise<OptionsChain> {
    const underlyingPrice = this.basePrices[symbol] || 1000;
    const expirationDate = expiration || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const strikes = this.generateStrikes(underlyingPrice, 20);

    return {
      symbol,
      expiration: expirationDate,
      strikes: strikes.map(strike => ({
        strike,
        call: this.generateOptionQuote('CALL', underlyingPrice, strike),
        put: this.generateOptionQuote('PUT', underlyingPrice, strike),
      })),
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
}

class MarketDataAppProvider implements MarketDataProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.MARKETDATA_API_KEY || '';
    this.baseUrl = 'https://api.marketdata.app/v1';
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    if (!this.apiKey) {
      throw new Error('MarketData.app API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/quotes/${symbol}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`MarketData.app API error: ${response.statusText}`);
      }

      const data = await response.json();
      return parseFloat(data.last) || parseFloat(data.price) || 0;
    } catch (error: any) {
      console.error('MarketData.app API error:', error);
      throw error;
    }
  }

  async getQuote(symbol: string): Promise<{ price: number; timestamp: number }> {
    const price = await this.getCurrentPrice(symbol);
    return { price, timestamp: Date.now() };
  }

  async getVIX(): Promise<number> {
    try {
      return await this.getCurrentPrice('VIX');
    } catch (error) {
      console.error('MarketData.app VIX fetch error:', error);
      throw error;
    }
  }

  // MarketData.app specific methods for options flow
  async getOptionsFlow(symbol: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('MarketData.app API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/options/flow/${symbol}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`MarketData.app API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('MarketData.app options flow error:', error);
      throw error;
    }
  }

  async getMarketBreadth(): Promise<any> {
    if (!this.apiKey) {
      throw new Error('MarketData.app API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/market/breadth`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`MarketData.app API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('MarketData.app market breadth error:', error);
      throw error;
    }
  }

  async getOptionsChain(symbol: string, expiration?: Date): Promise<OptionsChain> {
    if (!this.apiKey) {
      throw new Error('MarketData.app API key not configured');
    }

    try {
      // MarketData.app options chain endpoint
      const expirationStr = expiration ? expiration.toISOString().split('T')[0] : '';
      const url = expirationStr
        ? `${this.baseUrl}/options/chain/${symbol}?expiration=${expirationStr}`
        : `${this.baseUrl}/options/chain/${symbol}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`MarketData.app API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform MarketData.app format to our OptionsChain format
      const strikes = (data.strikes || []).map((strikeData: any) => ({
        strike: parseFloat(strikeData.strike),
        call: strikeData.call ? {
          bid: parseFloat(strikeData.call.bid) || 0,
          ask: parseFloat(strikeData.call.ask) || 0,
          last: parseFloat(strikeData.call.last) || 0,
          volume: parseInt(strikeData.call.volume) || 0,
          openInterest: parseInt(strikeData.call.openInterest) || 0,
          impliedVolatility: parseFloat(strikeData.call.iv) || 0,
          delta: strikeData.call.greeks?.delta ? parseFloat(strikeData.call.greeks.delta) : undefined,
          gamma: strikeData.call.greeks?.gamma ? parseFloat(strikeData.call.greeks.gamma) : undefined,
          theta: strikeData.call.greeks?.theta ? parseFloat(strikeData.call.greeks.theta) : undefined,
          vega: strikeData.call.greeks?.vega ? parseFloat(strikeData.call.greeks.vega) : undefined,
        } : undefined,
        put: strikeData.put ? {
          bid: parseFloat(strikeData.put.bid) || 0,
          ask: parseFloat(strikeData.put.ask) || 0,
          last: parseFloat(strikeData.put.last) || 0,
          volume: parseInt(strikeData.put.volume) || 0,
          openInterest: parseInt(strikeData.put.openInterest) || 0,
          impliedVolatility: parseFloat(strikeData.put.iv) || 0,
          delta: strikeData.put.greeks?.delta ? parseFloat(strikeData.put.greeks.delta) : undefined,
          gamma: strikeData.put.greeks?.gamma ? parseFloat(strikeData.put.greeks.gamma) : undefined,
          theta: strikeData.put.greeks?.theta ? parseFloat(strikeData.put.greeks.theta) : undefined,
          vega: strikeData.put.greeks?.vega ? parseFloat(strikeData.put.greeks.vega) : undefined,
        } : undefined,
      }));

      return {
        symbol,
        expiration: expiration || new Date(data.expiration || Date.now() + 7 * 24 * 60 * 60 * 1000),
        strikes: strikes.sort((a: any, b: any) => a.strike - b.strike),
      };
    } catch (error: any) {
      console.error('MarketData.app options chain error:', error);
      throw error;
    }
  }
}

/**
 * Get market data provider based on environment configuration
 * Falls back to mock provider if no real API is configured
 */
export function getMarketDataProvider(): MarketDataProvider {
  // Priority: Alpaca > Tradier > TwelveData > MarketData.app > Mock
  if (process.env.ALPACA_API_KEY && process.env.ALPACA_SECRET_KEY) {
    return new AlpacaProvider();
  }
  if (process.env.TRADIER_API_KEY) {
    return new TradierProvider();
  }
  if (process.env.TWELVEDATA_API_KEY) {
    return new TwelveDataProvider();
  }
  if (process.env.MARKETDATA_API_KEY) {
    return new MarketDataAppProvider();
  }
  
  console.warn('No market data API configured, using mock provider');
  return new MockProvider();
}

/**
 * Get options provider (prioritizes Tradier for options)
 */
export function getOptionsProvider(): MarketDataProvider {
  if (process.env.TRADIER_API_KEY) {
    return new TradierProvider();
  }
  if (process.env.MARKETDATA_API_KEY) {
    return new MarketDataAppProvider();
  }
  if (process.env.ALPACA_API_KEY && process.env.ALPACA_SECRET_KEY) {
    return new AlpacaProvider();
  }
  return new MockProvider();
}

/**
 * Get historical data provider (prioritizes TwelveData)
 */
export function getHistoricalDataProvider(): MarketDataProvider {
  if (process.env.TWELVEDATA_API_KEY) {
    return new TwelveDataProvider();
  }
  if (process.env.ALPACA_API_KEY && process.env.ALPACA_SECRET_KEY) {
    return new AlpacaProvider();
  }
  if (process.env.TRADIER_API_KEY) {
    return new TradierProvider();
  }
  return new MockProvider();
}

/**
 * Get VIX from any available provider
 */
export async function getVIX(): Promise<number> {
  const providers = [
    new TwelveDataProvider(),
    new TradierProvider(),
    new AlpacaProvider(),
    new MarketDataAppProvider(),
    new MockProvider(),
  ];

  for (const provider of providers) {
    if (provider.getVIX) {
      try {
        return await provider.getVIX();
      } catch (error) {
        // Try next provider
        continue;
      }
    }
  }

  // Fallback to mock
  return new MockProvider().getVIX!();
}

/**
 * Get current price for a symbol
 * Uses configured provider with fallback chain
 */
export async function getCurrentPrice(symbol: string): Promise<number> {
  const provider = getMarketDataProvider();
  const isMockProvider = provider instanceof MockProvider;
  
  try {
    const price = await provider.getCurrentPrice(symbol);
    
    // Log warning if using mock provider in production
    if (isMockProvider && process.env.NODE_ENV === 'production') {
      console.warn(`[Market Data] Using mock provider for ${symbol} - real API not configured or failed`);
    }
    
    return price;
  } catch (error: any) {
    console.error(`[Market Data] Failed to get price for ${symbol} from ${provider.constructor.name}:`, error.message);
    
    // Fallback to mock if real API fails
    const mockProvider = new MockProvider();
    console.warn(`[Market Data] Falling back to mock provider for ${symbol}`);
    
    return mockProvider.getCurrentPrice(symbol);
  }
}

/**
 * Get market price (alias for getCurrentPrice)
 */
export async function getMarketPrice(symbol: string): Promise<number> {
  return getCurrentPrice(symbol);
}

/**
 * Get options chain for a symbol
 */
export async function getOptionsChain(symbol: string, expiration?: Date): Promise<OptionsChain> {
  const provider = getOptionsProvider();
  
  try {
    if (provider.getOptionsChain) {
      return await provider.getOptionsChain(symbol, expiration);
    }
  } catch (error: any) {
    console.error(`[Market Data] Failed to get options chain for ${symbol}:`, error.message);
  }
  
  // Fallback to mock
  const mockProvider = new MockProvider();
  return mockProvider.getOptionsChain!(symbol, expiration);
}

/**
 * Get historical OHLCV data
 */
export async function getOHLCV(symbol: string, timeframe: string, limit: number): Promise<OHLCV[]> {
  const provider = getHistoricalDataProvider();
  
  try {
    if (provider.getOHLCV) {
      return await provider.getOHLCV(symbol, timeframe, limit);
    }
  } catch (error: any) {
    console.error(`[Market Data] Failed to get OHLCV for ${symbol}:`, error.message);
  }
  
  // Fallback to mock
  const mockProvider = new MockProvider();
  return mockProvider.getOHLCV!(symbol, timeframe, limit);
}

/**
 * Get IV Rank for a symbol
 */
export async function getIVRank(symbol: string): Promise<number> {
  const provider = getOptionsProvider();
  
  try {
    if (provider.getIVRank) {
      return await provider.getIVRank(symbol);
    }
  } catch (error: any) {
    console.error(`[Market Data] Failed to get IV rank for ${symbol}:`, error.message);
  }
  
  // Default to 50 (middle)
  return 50;
}

/**
 * Get IV Percentile for a symbol
 * IV Percentile = % of days where IV was lower than current (0-100)
 */
export async function getIVPercentile(symbol: string): Promise<number> {
  const provider = getOptionsProvider();
  
  try {
    if (provider.getIVPercentile) {
      return await provider.getIVPercentile(symbol);
    }
  } catch (error: any) {
    console.error(`[Market Data] Failed to get IV percentile for ${symbol}:`, error.message);
  }
  
  // Default to 50 (middle)
  return 50;
}

/**
 * Get options expirations for a symbol
 */
export async function getOptionsExpirations(symbol: string): Promise<Date[]> {
  const provider = getOptionsProvider();
  
  try {
    if (provider.getOptionsExpirations) {
      return await provider.getOptionsExpirations(symbol);
    }
  } catch (error: any) {
    console.error(`[Market Data] Failed to get options expirations for ${symbol}:`, error.message);
  }
  
  // Fallback: generate mock expirations
  const expirations: Date[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + (i + 1) * 7); // Weekly expirations
    expirations.push(date);
  }
  return expirations;
}

/**
 * Options Flow Data Interface
 */
export interface OptionsFlow {
  symbol: string;
  timestamp: Date;
  unusualActivity: Array<{
    strike: number;
    expiration: Date;
    optionType: 'CALL' | 'PUT';
    volume: number;
    openInterest: number;
    premium: number;
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    activityType: 'SWEEP' | 'BLOCK' | 'SPREAD' | 'OTHER';
  }>;
  totalCallVolume: number;
  totalPutVolume: number;
  putCallRatio: number;
}

/**
 * Get options flow (unusual activity) for a symbol
 */
export async function getOptionsFlow(symbol: string): Promise<OptionsFlow> {
  // Try MarketData.app first (has unique options flow feature)
  if (process.env.MARKETDATA_API_KEY) {
    try {
      const provider = new MarketDataAppProvider();
      const data = await provider.getOptionsFlow(symbol);
      
      // Transform MarketData.app format to our OptionsFlow format
      return {
        symbol,
        timestamp: new Date(),
        unusualActivity: (data.unusualActivity || []).map((item: any) => ({
          strike: parseFloat(item.strike),
          expiration: new Date(item.expiration),
          optionType: item.optionType,
          volume: parseInt(item.volume) || 0,
          openInterest: parseInt(item.openInterest) || 0,
          premium: parseFloat(item.premium) || 0,
          direction: item.direction || 'NEUTRAL',
          activityType: item.activityType || 'OTHER',
        })),
        totalCallVolume: parseInt(data.totalCallVolume) || 0,
        totalPutVolume: parseInt(data.totalPutVolume) || 0,
        putCallRatio: parseFloat(data.putCallRatio) || 0,
      };
    } catch (error: any) {
      console.error(`[Market Data] Failed to get options flow from MarketData.app:`, error.message);
    }
  }
  
  // Fallback: return empty flow
  return {
    symbol,
    timestamp: new Date(),
    unusualActivity: [],
    totalCallVolume: 0,
    totalPutVolume: 0,
    putCallRatio: 0,
  };
}

/**
 * Market Breadth Data Interface
 */
export interface MarketBreadth {
  timestamp: Date;
  advanceDecline: {
    advancing: number;
    declining: number;
    unchanged: number;
    ratio: number;
  };
  newHighsLows: {
    newHighs: number;
    newLows: number;
    ratio: number;
  };
  volume: {
    upVolume: number;
    downVolume: number;
    ratio: number;
  };
  vix: number;
  putCallRatio: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

/**
 * Get market breadth indicators
 */
export async function getMarketBreadth(): Promise<MarketBreadth> {
  // Try MarketData.app first (has unique market breadth feature)
  if (process.env.MARKETDATA_API_KEY) {
    try {
      const provider = new MarketDataAppProvider();
      const data = await provider.getMarketBreadth();
      
      // Transform MarketData.app format to our MarketBreadth format
      return {
        timestamp: new Date(),
        advanceDecline: {
          advancing: parseInt(data.advancing) || 0,
          declining: parseInt(data.declining) || 0,
          unchanged: parseInt(data.unchanged) || 0,
          ratio: parseFloat(data.advanceDeclineRatio) || 0,
        },
        newHighsLows: {
          newHighs: parseInt(data.newHighs) || 0,
          newLows: parseInt(data.newLows) || 0,
          ratio: parseFloat(data.newHighsLowsRatio) || 0,
        },
        volume: {
          upVolume: parseFloat(data.upVolume) || 0,
          downVolume: parseFloat(data.downVolume) || 0,
          ratio: parseFloat(data.volumeRatio) || 0,
        },
        vix: parseFloat(data.vix) || 0,
        putCallRatio: parseFloat(data.putCallRatio) || 0,
        sentiment: data.sentiment || 'NEUTRAL',
      };
    } catch (error: any) {
      console.error(`[Market Data] Failed to get market breadth from MarketData.app:`, error.message);
    }
  }
  
  // Fallback: return neutral breadth
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

