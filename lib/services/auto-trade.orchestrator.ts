/**
 * Auto-Trade Orchestrator
 * Agent 5: Main controller that ties everything together
 */

import { EventEmitter } from 'events';
import { MarketDataService } from './market-data.service';
import { SignalGeneratorService, GeneratedSignal } from './signal-generator.service';
import { PaperExecutorService } from './paper-executor.service';
import { runDecisionEngine } from '../decision-engine';
import pool from '../db';

export type TradeMode = 'PAPER' | 'SHADOW' | 'LIVE';

export interface AutoTradeConfig {
  enabled: boolean;
  mode: TradeMode;
  tradingSchedule: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    timezone: string;
  };
  maxDailyTrades: number;
  maxDailyLoss: number;
  maxPositionSize: number;
  maxTotalExposure: number;
  timeframeWeights: {
    INTRADAY: number;
    SWING: number;
    MONTHLY: number;
    LEAPS: number;
  };
  algorithmVersion: string;
  algorithmConfig: Record<string, any>;
}

export interface TradeDecision {
  signalId: string;
  signal: GeneratedSignal;
  gateResults: any[];
  decision: 'TRADE' | 'BLOCK';
  blockReason?: string;
  strategy?: string;
  legs?: any[];
  positionSize?: number;
  risk?: number;
  expectedRR?: number;
}

export interface OrchestratorStatus {
  enabled: boolean;
  mode: TradeMode;
  isRunning: boolean;
  isPaused: boolean;
  sessionStart?: Date;
  signalsGenerated: number;
  tradesExecuted: number;
  tradesBlocked: number;
  dailyPnL: number;
  dailyTrades: number;
  tradesRemaining: number;
  currentDrawdown: number;
  maxDrawdownReached: boolean;
  dailyLimitReached: boolean;
  openPositions: number;
  totalExposure: number;
}

export class AutoTradeOrchestrator extends EventEmitter {
  private config: AutoTradeConfig;
  private marketData: MarketDataService;
  private signalGenerator: SignalGeneratorService;
  private executor: PaperExecutorService;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private sessionStart?: Date;
  private signalsGenerated: number = 0;
  private tradesExecuted: number = 0;
  private tradesBlocked: number = 0;
  private dailyPnL: number = 0;

  constructor(
    config: AutoTradeConfig,
    marketData: MarketDataService,
    signalGenerator: SignalGeneratorService,
    executor: PaperExecutorService
  ) {
    super();
    this.config = config;
    this.marketData = marketData;
    this.signalGenerator = signalGenerator;
    this.executor = executor;

    // Subscribe to signals
    this.signalGenerator.onSignal((signal) => {
      this.onSignalReceived(signal);
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    // Validate config
    if (!this.config.enabled) {
      throw new Error('Auto-trade is not enabled in config');
    }

    // Initialize services
    await this.marketData.start();
    await this.signalGenerator.start();

    this.isRunning = true;
    this.isPaused = false;
    this.sessionStart = new Date();
    this.signalsGenerated = 0;
    this.tradesExecuted = 0;
    this.tradesBlocked = 0;

    console.log('[AutoTradeOrchestrator] Started');
    this.emit('status', this.getStatus());
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    await this.signalGenerator.stop();
    await this.marketData.stop();

    this.isRunning = false;
    console.log('[AutoTradeOrchestrator] Stopped');
    this.emit('status', this.getStatus());
  }

  async pause(): Promise<void> {
    if (!this.isRunning || this.isPaused) return;

    this.isPaused = true;
    console.log('[AutoTradeOrchestrator] Paused');
    this.emit('status', this.getStatus());
  }

  async resume(): Promise<void> {
    if (!this.isRunning || !this.isPaused) return;

    this.isPaused = false;
    console.log('[AutoTradeOrchestrator] Resumed');
    this.emit('status', this.getStatus());
  }

  async killSwitch(): Promise<void> {
    console.log('[AutoTradeOrchestrator] KILL SWITCH ACTIVATED');
    
    // Stop all trading
    await this.stop();
    
    // Close all positions at market
    const positions = await this.executor.getAllPositions();
    for (const position of positions) {
      try {
        await this.executor.closePosition(position.id);
      } catch (error) {
        console.error(`[AutoTradeOrchestrator] Error closing position ${position.id}:`, error);
      }
    }
    
    // Disable auto-trade
    this.config.enabled = false;
    await this.saveState();
    
    // Emit alert
    this.emit('killSwitch', { timestamp: new Date() });
  }

  async closeAllPositions(): Promise<void> {
    const positions = await this.executor.getAllPositions();
    for (const position of positions) {
      await this.executor.closePosition(position.id);
    }
  }

  async updateConfig(updates: Partial<AutoTradeConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveState();
    this.emit('config', this.config);
  }

  async getConfig(): Promise<AutoTradeConfig> {
    return { ...this.config };
  }

  getStatus(): OrchestratorStatus {
    const account = this.executor.getAccountSummary();
    
    return {
      enabled: this.config.enabled,
      mode: this.config.mode,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      sessionStart: this.sessionStart,
      signalsGenerated: this.signalsGenerated,
      tradesExecuted: this.tradesExecuted,
      tradesBlocked: this.tradesBlocked,
      dailyPnL: this.dailyPnL,
      dailyTrades: this.tradesExecuted,
      tradesRemaining: Math.max(0, this.config.maxDailyTrades - this.tradesExecuted),
      currentDrawdown: 0, // Would calculate from equity curve
      maxDrawdownReached: this.dailyPnL <= -this.config.maxDailyLoss,
      dailyLimitReached: this.tradesExecuted >= this.config.maxDailyTrades,
      openPositions: (await account).openPositions || 0,
      totalExposure: 0, // Would calculate from positions
    };
  }

  private async onSignalReceived(signal: GeneratedSignal): Promise<void> {
    if (this.isPaused || !this.isRunning) return;

    this.signalsGenerated++;

    try {
      // Convert to TradingViewSignal format
      const tradingViewSignal = {
        symbol: signal.symbol,
        resolution: signal.timeframe,
        timestamp: signal.timestamp.getTime(),
        signal_type: signal.signal_type,
        direction: signal.direction,
        confidence: signal.confidence,
        signal_strength: signal.confidence,
        confluence_count: signal.confluence_count,
        entry_price: signal.entry_price,
        stop_loss: signal.stop_loss,
        take_profit_1: signal.take_profit_1,
        active_signals: signal.active_signals,
      };

      // Run through decision engine
      const decisionResult = runDecisionEngine(tradingViewSignal);
      
      // Create decision object
      const decision: TradeDecision = {
        signalId: signal.id,
        signal,
        gateResults: decisionResult.gate_results,
        decision: decisionResult.decision,
        blockReason: decisionResult.block_reason,
        strategy: decisionResult.trade_mode,
        positionSize: decisionResult.risk_calculation.quantity,
        risk: decisionResult.risk_calculation.adjusted_risk,
        expectedRR: decisionResult.risk_calculation.risk_reward,
      };

      // Log decision
      await this.logDecision(decision);

      // Emit decision
      this.emit('decision', decision);

      // Execute if approved
      if (decision.decision === 'TRADE' && this.config.mode !== 'SHADOW') {
        await this.executeDecision(decision);
      } else if (decision.decision === 'BLOCK') {
        this.tradesBlocked++;
      }
    } catch (error) {
      console.error('[AutoTradeOrchestrator] Error processing signal:', error);
    }
  }

  private async executeDecision(decision: TradeDecision): Promise<void> {
    if (this.config.mode === 'SHADOW') {
      console.log('[AutoTradeOrchestrator] Shadow mode - not executing trade');
      return;
    }

    // Check daily limits
    if (this.tradesExecuted >= this.config.maxDailyTrades) {
      console.log('[AutoTradeOrchestrator] Daily trade limit reached');
      return;
    }

    try {
      // Create order
      const order = {
        id: `auto-${decision.signalId}-${Date.now()}`,
        symbol: decision.signal.symbol,
        side: decision.signal.direction === 'LONG' ? 'BUY' : 'SELL',
        type: 'MARKET' as const,
        quantity: decision.positionSize || 1,
        timeInForce: 'DAY' as const,
      };

      // Submit order
      const result = await this.executor.submitOrder(order);
      
      if (result.status === 'FILLED') {
        this.tradesExecuted++;
        
        // Store in database
        await pool.query(
          `INSERT INTO paper_trades (
            symbol, direction, entry_price, quantity, stop_loss, take_profit_1, status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'OPEN')`,
          [
            decision.signal.symbol,
            decision.signal.direction,
            decision.signal.entry_price,
            decision.positionSize,
            decision.signal.stop_loss,
            decision.signal.take_profit_1,
          ]
        );

        this.emit('trade', { order, decision });
      }
    } catch (error) {
      console.error('[AutoTradeOrchestrator] Error executing trade:', error);
    }
  }

  private async logDecision(decision: TradeDecision): Promise<void> {
    try {
      // Store signal
      await pool.query(
        `INSERT INTO auto_signals (
          symbol, timestamp, timeframe, signal_type, direction, confidence,
          confluence_count, active_signals, entry_price, stop_loss, take_profit_1, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          decision.signal.symbol,
          decision.signal.timestamp,
          decision.signal.timeframe,
          decision.signal.signal_type,
          decision.signal.direction,
          decision.signal.confidence,
          decision.signal.confluence_count,
          JSON.stringify(decision.signal.active_signals),
          decision.signal.entry_price,
          decision.signal.stop_loss,
          decision.signal.take_profit_1,
          JSON.stringify(decision.signal.metadata),
        ]
      );

      // Store decision
      await pool.query(
        `INSERT INTO auto_decisions (
          signal_id, algorithm_version, decision, block_reason, gate_results,
          strategy, trade_mode, position_size, risk_amount, expected_rr,
          total_score, score_breakdown
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          decision.signalId,
          this.config.algorithmVersion,
          decision.decision,
          decision.blockReason,
          JSON.stringify(decision.gateResults),
          decision.strategy,
          decision.strategy,
          decision.positionSize,
          decision.risk,
          decision.expectedRR,
          0, // Would get from decision result
          JSON.stringify({}),
        ]
      );
    } catch (error) {
      console.error('[AutoTradeOrchestrator] Error logging decision:', error);
    }
  }

  private async saveState(): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO auto_trade_state (enabled, mode, is_running, is_paused, algorithm_version, config)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           enabled = $1, mode = $2, is_running = $3, is_paused = $4,
           algorithm_version = $5, config = $6, updated_at = NOW()`,
        [
          this.config.enabled,
          this.config.mode,
          this.isRunning,
          this.isPaused,
          this.config.algorithmVersion,
          JSON.stringify(this.config),
        ]
      );
    } catch (error) {
      console.error('[AutoTradeOrchestrator] Error saving state:', error);
    }
  }
}


