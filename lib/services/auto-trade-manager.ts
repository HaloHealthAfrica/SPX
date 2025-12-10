/**
 * Auto-Trade Manager
 * Singleton manager for auto-trade orchestrator instance
 * Agent 4: Provides access to orchestrator from API routes
 */

import { AutoTradeOrchestrator, AutoTradeConfig } from './auto-trade.orchestrator';
import { MarketDataService } from './market-data.service';
import { SignalGeneratorService } from './signal-generator.service';
import { PaperExecutorService } from './paper-executor.service';
import { StrikeSelectorService } from './strike-selector.service';
import pool from '../db';

class AutoTradeManager {
  private static instance: AutoTradeManager;
  private orchestrator?: AutoTradeOrchestrator;
  private marketData?: MarketDataService;
  private signalGenerator?: SignalGeneratorService;
  private executor?: PaperExecutorService;
  private strikeSelector?: StrikeSelectorService;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): AutoTradeManager {
    if (!AutoTradeManager.instance) {
      AutoTradeManager.instance = new AutoTradeManager();
    }
    return AutoTradeManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load config from database (handle missing table gracefully)
      let dbConfig = {};
      try {
        const configResult = await pool.query(
          'SELECT config FROM auto_trade_state ORDER BY updated_at DESC LIMIT 1'
        );
        dbConfig = configResult.rows[0]?.config || {};
      } catch (error: any) {
        // Table might not exist yet, use defaults
        console.warn('[AutoTradeManager] Could not load config from database:', error.message);
      }
      const config: AutoTradeConfig = {
        enabled: (dbConfig as any).enabled || false,
        mode: (dbConfig as any).mode || 'PAPER',
        tradingSchedule: (dbConfig as any).tradingSchedule || {
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: '09:30',
          endTime: '16:00',
          timezone: 'America/New_York',
        },
        maxDailyTrades: (dbConfig as any).maxDailyTrades || 5,
        maxDailyLoss: (dbConfig as any).maxDailyLoss || 2500,
        maxPositionSize: (dbConfig as any).maxPositionSize || 20000,
        maxTotalExposure: (dbConfig as any).maxTotalExposure || 50000,
        timeframeWeights: (dbConfig as any).timeframeWeights || {
          INTRADAY: 0.3,
          SWING: 0.4,
          MONTHLY: 0.2,
          LEAPS: 0.1,
        },
        algorithmVersion: (dbConfig as any).algorithmVersion || 'v1.0',
        algorithmConfig: (dbConfig as any).algorithmConfig || {},
      };

      // Initialize services
      this.marketData = new MarketDataService({
        symbols: ['SPX'],
        dataSource: process.env.MARKET_DATA_SOURCE as any || 'mock',
        pollInterval: 5000,
      });

      this.signalGenerator = new SignalGeneratorService({
        symbols: ['SPX'],
        timeframes: ['15m', '1h', '4h', '1d'],
        enabledSignals: [
          'STRAT_212', 'BOS', 'MSS', 'CHoCH',
          'SWEEP_LOW', 'SWEEP_HIGH', 'SMT',
          'FVG', 'DISPLACEMENT', 'BREAKER',
          'VOLUME_SURGE', 'ORB',
        ],
        minConfidence: 6.0,
      }, this.marketData);

      this.executor = new PaperExecutorService({
        accountSize: 100000,
        slippageModel: 'fixed',
        slippageBps: 5,
        fillDelay: 100,
        partialFillProbability: 0.1,
        rejectProbability: 0.05,
      });

      this.strikeSelector = new StrikeSelectorService(this.marketData);

      // Create orchestrator
      this.orchestrator = new AutoTradeOrchestrator(
        config,
        this.marketData,
        this.signalGenerator,
        this.executor
      );

      this.isInitialized = true;
      console.log('[AutoTradeManager] Initialized');
    } catch (error) {
      console.error('[AutoTradeManager] Initialization error:', error);
      throw error;
    }
  }

  getOrchestrator(): AutoTradeOrchestrator | undefined {
    return this.orchestrator;
  }

  getStrikeSelector(): StrikeSelectorService | undefined {
    return this.strikeSelector;
  }

  getMarketData(): MarketDataService | undefined {
    return this.marketData;
  }

  async start(): Promise<void> {
    await this.initialize();
    if (this.orchestrator) {
      await this.orchestrator.start();
    }
  }

  async stop(): Promise<void> {
    if (this.orchestrator) {
      await this.orchestrator.stop();
    }
  }

  async getStatus() {
    if (this.orchestrator) {
      return this.orchestrator.getStatus();
    }
    return null;
  }
}

export const autoTradeManager = AutoTradeManager.getInstance();

