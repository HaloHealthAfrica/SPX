/**
 * Paper Execution Service
 * Agent 4: Simulates order execution with realistic fills
 */

import pool from '../db';
import { OptionStrategy } from '../options/types';

export interface PaperExecutorConfig {
  accountSize: number;
  slippageModel: 'none' | 'fixed' | 'volume_based';
  slippageBps: number;
  fillDelay: number;
  partialFillProbability: number;
  rejectProbability: number;
}

export interface PaperOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  timeInForce: 'DAY' | 'GTC' | 'IOC' | 'FOK';
  optionType?: 'CALL' | 'PUT';
  strike?: number;
  expiration?: Date;
  legs?: PaperOrderLeg[];
}

export interface PaperOrderLeg {
  side: 'BUY' | 'SELL';
  quantity: number;
  optionType: 'CALL' | 'PUT';
  strike: number;
  expiration: Date;
}

export interface PaperFill {
  orderId: string;
  fillId: string;
  timestamp: Date;
  quantity: number;
  price: number;
  commission: number;
  slippage: number;
}

export interface PaperPosition {
  id: string;
  symbol: string;
  strategy: OptionStrategy | 'DIRECTIONAL';
  legs: PositionLeg[];
  entryTime: Date;
  entryPrice: number;
  quantity: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  greeks?: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  status: 'OPEN' | 'PARTIAL' | 'CLOSED';
}

export interface PositionLeg {
  symbol: string;
  strike: number;
  expiration: Date;
  optionType: 'CALL' | 'PUT';
  quantity: number;
  entryPrice: number;
}

export interface AccountSummary {
  cash: number;
  equity: number;
  buyingPower: number;
  totalValue: number;
  openPositions: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

export class PaperExecutorService {
  private config: PaperExecutorConfig;
  private positions: Map<string, PaperPosition> = new Map();
  private orders: Map<string, PaperOrder> = new Map();
  private fills: PaperFill[] = [];
  private cash: number;
  private equity: number;
  private buyingPower: number;

  constructor(config: PaperExecutorConfig) {
    this.config = config;
    this.cash = config.accountSize;
    this.equity = config.accountSize;
    this.buyingPower = config.accountSize;
  }

  async submitOrder(order: PaperOrder): Promise<{ orderId: string; status: string }> {
    // Simulate order delay
    await this.delay(this.config.fillDelay);

    // Check for rejection
    if (Math.random() < this.config.rejectProbability) {
      return { orderId: order.id, status: 'REJECTED' };
    }

    // Calculate fill price with slippage
    const fillPrice = await this.calculateFillPrice(order);
    
    // Check partial fill
    const fillQuantity = Math.random() < this.config.partialFillProbability
      ? Math.floor(order.quantity * (0.5 + Math.random() * 0.5))
      : order.quantity;

    // Calculate commission
    const commission = this.calculateCommission(fillQuantity, fillPrice);
    
    // Calculate slippage
    const slippage = this.calculateSlippage(order, fillPrice);

    // Create fill
    const fill: PaperFill = {
      orderId: order.id,
      fillId: `${order.id}-${Date.now()}`,
      timestamp: new Date(),
      quantity: fillQuantity,
      price: fillPrice,
      commission,
      slippage,
    };

    this.fills.push(fill);
    this.orders.set(order.id, order);

    // Update account
    const cost = fillPrice * fillQuantity + commission;
    if (order.side === 'BUY') {
      this.cash -= cost;
    } else {
      this.cash += cost - commission;
    }

    // Create or update position
    await this.updatePosition(order, fill);

    return { orderId: order.id, status: 'FILLED' };
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order || order.timeInForce === 'FOK') {
      return false;
    }
    
    this.orders.delete(orderId);
    return true;
  }

  async getPosition(positionId: string): Promise<PaperPosition | null> {
    return this.positions.get(positionId) || null;
  }

  async getAllPositions(): Promise<PaperPosition[]> {
    return Array.from(this.positions.values());
  }

  async closePosition(positionId: string, quantity?: number): Promise<PaperFill[]> {
    const position = this.positions.get(positionId);
    if (!position) return [];

    const closeQuantity = quantity || position.quantity;
    const currentPrice = await this.getCurrentPrice(position.symbol);
    
    // Create closing order
    const order: PaperOrder = {
      id: `close-${positionId}-${Date.now()}`,
      symbol: position.symbol,
      side: position.quantity > 0 ? 'SELL' : 'BUY',
      type: 'MARKET',
      quantity: closeQuantity,
      timeInForce: 'DAY',
    };

    const fill = await this.submitOrder(order);
    
    // Update position
    if (closeQuantity >= position.quantity) {
      position.status = 'CLOSED';
      this.positions.delete(positionId);
    } else {
      position.quantity -= closeQuantity;
      position.status = 'PARTIAL';
    }

    return this.fills.filter(f => f.orderId === order.id);
  }

  async getAccountSummary(): Promise<AccountSummary> {
    // Calculate unrealized P&L
    let unrealizedPnL = 0;
    for (const position of this.positions.values()) {
      unrealizedPnL += position.unrealizedPnL;
    }

    // Calculate realized P&L from closed positions
    const realizedPnL = this.fills
      .filter(f => f.orderId.startsWith('close-'))
      .reduce((sum, f) => sum + (f.price * f.quantity - f.commission), 0);

    this.equity = this.cash + unrealizedPnL;
    this.buyingPower = this.equity * 2; // 2x margin for paper trading

    return {
      cash: this.cash,
      equity: this.equity,
      buyingPower: this.buyingPower,
      totalValue: this.equity,
      openPositions: this.positions.size,
      unrealizedPnL,
      realizedPnL,
    };
  }

  async getOrderHistory(filter?: any): Promise<PaperOrder[]> {
    return Array.from(this.orders.values());
  }

  async getFillHistory(filter?: any): Promise<PaperFill[]> {
    return this.fills;
  }

  private async calculateFillPrice(order: PaperOrder): Promise<number> {
    if (order.type === 'MARKET') {
      // Get current market price
      const marketPrice = await this.getCurrentPrice(order.symbol);
      return marketPrice;
    }
    
    if (order.type === 'LIMIT' && order.limitPrice) {
      return order.limitPrice;
    }
    
    return await this.getCurrentPrice(order.symbol);
  }

  private calculateSlippage(order: PaperOrder, fillPrice: number): number {
    if (this.config.slippageModel === 'none') return 0;
    
    if (this.config.slippageModel === 'fixed') {
      return fillPrice * (this.config.slippageBps / 10000);
    }
    
    // Volume-based slippage
    const baseSlippage = fillPrice * (this.config.slippageBps / 10000);
    const volumeMultiplier = Math.min(2.0, order.quantity / 100); // More slippage for larger orders
    return baseSlippage * volumeMultiplier;
  }

  private calculateCommission(quantity: number, price: number): number {
    // $1 per contract for options, $0.01 per share for stocks
    return quantity * 1.0; // Simplified
  }

  private async updatePosition(order: PaperOrder, fill: PaperFill): Promise<void> {
    const positionId = order.id;
    let position = this.positions.get(positionId);
    
    if (!position) {
      // Convert PaperOrderLeg[] to PositionLeg[]
      const positionLegs: PositionLeg[] = (order.legs || []).map(leg => ({
        symbol: order.symbol,
        strike: leg.strike,
        expiration: leg.expiration,
        optionType: leg.optionType,
        quantity: leg.quantity,
        entryPrice: fill.price, // Use fill price as entry price
      }));

      position = {
        id: positionId,
        symbol: order.symbol,
        strategy: order.legs ? 'CALL_DEBIT_SPREAD' : 'DIRECTIONAL',
        legs: positionLegs,
        entryTime: fill.timestamp,
        entryPrice: fill.price,
        quantity: fill.quantity,
        currentPrice: fill.price,
        unrealizedPnL: 0,
        realizedPnL: 0,
        stopLoss: 0, // Would be set from decision
        takeProfit1: 0, // Would be set from decision
        status: 'OPEN',
      };
      this.positions.set(positionId, position);
    } else {
      // Update existing position
      const totalCost = (position.entryPrice * position.quantity) + (fill.price * fill.quantity);
      const totalQuantity = position.quantity + fill.quantity;
      position.entryPrice = totalCost / totalQuantity;
      position.quantity = totalQuantity;
    }
    
    // Update current price and P&L
    position.currentPrice = await this.getCurrentPrice(order.symbol);
    position.unrealizedPnL = (position.currentPrice - position.entryPrice) * position.quantity;
  }

  private async getCurrentPrice(symbol: string): Promise<number> {
    // Use real market data provider
    try {
      const { getMarketPrice } = await import('../market-data');
      return await getMarketPrice(symbol);
    } catch (error: any) {
      console.error(`[PaperExecutor] Failed to get price for ${symbol}, using fallback:`, error.message);
      // Fallback to mock price if real provider fails
      return 4500 + (Math.random() - 0.5) * 50;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Position monitoring (would be called periodically)
  async monitorPositions(): Promise<void> {
    for (const position of this.positions.values()) {
      if (position.status === 'CLOSED') continue;
      
      // Update current price
      position.currentPrice = await this.getCurrentPrice(position.symbol);
      position.unrealizedPnL = (position.currentPrice - position.entryPrice) * position.quantity;
      
      // Check stop loss
      if (position.stopLoss > 0) {
        if (position.quantity > 0 && position.currentPrice <= position.stopLoss) {
          await this.closePosition(position.id);
        } else if (position.quantity < 0 && position.currentPrice >= position.stopLoss) {
          await this.closePosition(position.id);
        }
      }
      
      // Check take profit
      if (position.takeProfit1 > 0) {
        if (position.quantity > 0 && position.currentPrice >= position.takeProfit1) {
          await this.closePosition(position.id);
        } else if (position.quantity < 0 && position.currentPrice <= position.takeProfit1) {
          await this.closePosition(position.id);
        }
      }
    }
  }
}


