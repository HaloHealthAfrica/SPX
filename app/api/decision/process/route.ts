import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { runDecisionEngine } from '@/lib/decision-engine';
import { runOptionsDecisionEngine, OptionsDecisionInput } from '@/lib/options/decision-engine';
import { TradingViewSignal } from '@/lib/types';
import { ProcessDecisionSchema, validateRequest } from '@/lib/validation/schemas';
import { checkAllCooldowns, setSymbolCooldown, setSignalTypeCooldown } from '@/lib/utils/cooldowns';
import { isVolatilityAcceptable } from '@/lib/utils/volatility';
import { SignalProcessorService } from '@/lib/services/signal-processor.service';
import { autoTradeManager } from '@/lib/services/auto-trade-manager';
import { StrikeSelectorService } from '@/lib/services/strike-selector.service';
import { classifyTimeframe } from '@/lib/options/timeframe';
import { selectStrategy } from '@/lib/options/strategy-selection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = validateRequest(ProcessDecisionSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error },
        { status: 400 }
      );
    }

    const { signal_id } = validation.data;

    // Fetch signal from database
    const signalResult = await pool.query(
      'SELECT * FROM signals_log WHERE id = $1',
      [signal_id]
    );

    if (signalResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Signal not found' },
        { status: 404 }
      );
    }

    const signalRow = signalResult.rows[0];

    // Convert to TradingViewSignal format
    const signal: TradingViewSignal = {
      symbol: signalRow.symbol,
      resolution: signalRow.resolution,
      timestamp: Number(signalRow.timestamp),
      signal_type: signalRow.signal_type,
      direction: signalRow.direction,
      confidence: Number(signalRow.confidence),
      signal_strength: Number(signalRow.signal_strength),
      confluence_count: signalRow.confluence_count,
      entry_price: Number(signalRow.entry_price),
      stop_loss: Number(signalRow.stop_loss),
      take_profit_1: Number(signalRow.take_profit_1),
      active_signals: signalRow.active_signals || [],
    };

    // Check Gate 7: Daily Limits
    const today = new Date().toISOString().split('T')[0];
    const dailyLimitResult = await pool.query(
      'SELECT * FROM daily_limits WHERE trade_date = $1',
      [today]
    );

    let dailyLimit = dailyLimitResult.rows[0];
    if (!dailyLimit) {
      // Create new daily limit record
      const insertResult = await pool.query(
        'INSERT INTO daily_limits (trade_date, trades_count, daily_pnl, max_drawdown, breached) VALUES ($1, 0, 0, 0, false) RETURNING *',
        [today]
      );
      dailyLimit = insertResult.rows[0];
    }

    // Check cooldowns
    const cooldownCheck = await checkAllCooldowns(signal.symbol, signal.signal_type);
    if (!cooldownCheck.allowed) {
      return NextResponse.json({
        success: false,
        decision: 'BLOCK',
        block_reason: cooldownCheck.reason,
        cooldowns: cooldownCheck.cooldowns,
      });
    }

    // Check volatility
    const volatilityCheck = await isVolatilityAcceptable(30); // VIX threshold = 30
    if (!volatilityCheck.acceptable) {
      return NextResponse.json({
        success: false,
        decision: 'BLOCK',
        block_reason: volatilityCheck.reason,
        vix: volatilityCheck.vix,
      });
    }

    // Detect if this is an options trade
    const isOptions = signalRow.symbol === 'SPX' || signalRow.symbol === 'SPXW' || 
                      (signalRow.metadata && JSON.parse(signalRow.metadata || '{}').isOptions);
    
    let decision;
    let strikeSelection = null;
    let timeframe: any = null;
    
    // Initialize services for options trading
    if (isOptions) {
      try {
        await autoTradeManager.initialize();
        const strikeSelector = autoTradeManager.getStrikeSelector();
        const marketData = autoTradeManager.getMarketData();
        
        if (strikeSelector && marketData) {
          // Classify timeframe
          timeframe = classifyTimeframe(signal, undefined);
          
          // Select strike
          const strategy = selectStrategy(
            signal.direction,
            'TREND', // Will be determined by decision engine
            timeframe,
            50, // IV rank - would fetch from market data
            signal.confidence >= 7.0 ? 'HIGH' : signal.confidence >= 6.0 ? 'MEDIUM' : 'LOW'
          );
          
          strikeSelection = await strikeSelector.selectStrikes({
            underlyingPrice: signal.entry_price,
            direction: signal.direction,
            timeframe,
            strategy,
            minRR: timeframe === 'INTRADAY' ? 1.5 : timeframe === 'SWING' ? 2.0 : 2.5,
          });
          
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
              gamma: strikeSelection.primary.quote.gamma || 0,
              theta: strikeSelection.primary.quote.theta || 0,
              vega: strikeSelection.primary.quote.vega || 0,
            },
            bidAskSpread: (strikeSelection.primary.quote.ask - strikeSelection.primary.quote.bid) / 
                         ((strikeSelection.primary.quote.ask + strikeSelection.primary.quote.bid) / 2),
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
            ivRank: 50,
            ivPercentile: 50,
            greeks: {
              delta: strikeSelection.primary.delta,
              gamma: strikeSelection.primary.quote.gamma || 0,
              theta: strikeSelection.primary.quote.theta || 0,
              vega: strikeSelection.primary.quote.vega || 0,
            },
            bidAskSpread: (strikeSelection.primary.quote.ask - strikeSelection.primary.quote.bid) / 
                         ((strikeSelection.primary.quote.ask + strikeSelection.primary.quote.bid) / 2),
            openInterest: strikeSelection.primary.quote.openInterest,
            volume: strikeSelection.primary.quote.volume,
          });
        } else {
          // Fallback to directional if strike selector unavailable
          decision = runDecisionEngine(signal);
        }
      } catch (error) {
        console.error('[Decision] Error in options processing, falling back to directional:', error);
        decision = runDecisionEngine(signal);
      }
    } else {
      // Use directional decision engine
      decision = runDecisionEngine(signal);
    }
    
    decision.signal_id = signal_id;
    
    // Route to auto-trade orchestrator if enabled
    try {
      await autoTradeManager.initialize();
      const orchestrator = autoTradeManager.getOrchestrator();
      const status = await autoTradeManager.getStatus();
      
      if (orchestrator && status?.enabled && status?.isRunning && status?.mode !== 'SHADOW') {
        // Convert to GeneratedSignal format for orchestrator
        const generatedSignal = {
          id: `webhook-${signal_id}-${Date.now()}`,
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
            strikeSelection,
            isOptions,
          },
        };
        
        // Emit to orchestrator (it will process through its own decision engine)
        orchestrator.emit('signal', generatedSignal);
      }
    } catch (error) {
      console.error('[Decision] Error routing to auto-trade:', error);
      // Continue with manual execution
    }
    
    // Update volatility check in gate results
    const gate2Index = decision.gate_results.findIndex(g => g.gate === 'Session & Volatility');
    if (gate2Index >= 0) {
      decision.gate_results[gate2Index].volatilityCheck = {
        vix: volatilityCheck.vix ?? null,
        acceptable: volatilityCheck.acceptable,
      };
    }

    // Check daily limits
    if (decision.decision === 'TRADE') {
      if (dailyLimit.trades_count >= 5) {
        decision.decision = 'BLOCK';
        decision.block_reason = 'Daily trade limit reached (5 trades)';
        decision.gate_results.push({
          gate: 'Daily Limits',
          passed: false,
          reason: 'Daily trade limit reached',
        });
      } else if (dailyLimit.daily_pnl <= -2500) {
        decision.decision = 'BLOCK';
        decision.block_reason = 'Daily drawdown limit reached (-$2,500)';
        decision.gate_results.push({
          gate: 'Daily Limits',
          passed: false,
          reason: 'Daily drawdown limit reached',
        });
      } else {
        decision.gate_results.push({
          gate: 'Daily Limits',
          passed: true,
        });
      }
    }

    // Insert decision audit (with options data if applicable)
    const auditResult = await pool.query(
      `INSERT INTO decision_audit (
        signal_id, decision, trade_mode, block_reason,
        gate_results, signals, score_breakdown, regime, risk_calculation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        decision.signal_id,
        decision.decision,
        decision.trade_mode || (decision as any).strategy,
        decision.block_reason,
        JSON.stringify(decision.gate_results),
        JSON.stringify(decision.signals),
        JSON.stringify(decision.score_breakdown),
        JSON.stringify(decision.regime),
        JSON.stringify({
          ...decision.risk_calculation,
          strikeSelection: strikeSelection,
          isOptions: isOptions,
          timeframe: timeframe,
        }),
      ]
    );

    const decisionId = auditResult.rows[0].id;

    // Mark signal as processed
    await pool.query(
      'UPDATE signals_log SET processed = true WHERE id = $1',
      [signal_id]
    );

    // If decision is TRADE, check position limits and execute
    if (decision.decision === 'TRADE') {
      // Check position size limits
      const openPositionsResult = await pool.query(
        `SELECT symbol, SUM(quantity * entry_price) as total_value
         FROM paper_trades
         WHERE status = 'OPEN'
         GROUP BY symbol`
      );

      const accountValue = 100000; // $100k account
      const maxPositionValue = accountValue * 0.20; // 20% per symbol
      const maxTotalPositions = 5;
      
      // Check total open positions
      const totalOpenResult = await pool.query(
        "SELECT COUNT(*) as count FROM paper_trades WHERE status = 'OPEN'"
      );
      const totalOpen = parseInt(totalOpenResult.rows[0]?.count || '0');
      
      if (totalOpen >= maxTotalPositions) {
        decision.decision = 'BLOCK';
        decision.block_reason = `Maximum open positions reached (${totalOpen}/${maxTotalPositions})`;
        decision.gate_results.push({
          gate: 'Position Limits',
          passed: false,
          reason: 'Max open positions reached',
        });
        
        // Update decision audit
        await pool.query(
          `UPDATE decision_audit 
           SET decision = 'BLOCK', block_reason = $1, gate_results = $2
           WHERE id = $3`,
          [
            decision.block_reason,
            JSON.stringify(decision.gate_results),
            decisionId,
          ]
        );
      } else {
        // Check position size for this symbol
        const symbolPosition = openPositionsResult.rows.find((p: any) => p.symbol === signal.symbol);
        const currentSymbolValue = symbolPosition ? parseFloat(symbolPosition.total_value) : 0;
        const newPositionValue = decision.risk_calculation.quantity * signal.entry_price;
        
        if (currentSymbolValue + newPositionValue > maxPositionValue) {
          decision.decision = 'BLOCK';
          decision.block_reason = `Position size limit exceeded for ${signal.symbol} (${((currentSymbolValue + newPositionValue) / accountValue * 100).toFixed(1)}% of account)`;
          decision.gate_results.push({
            gate: 'Position Limits',
            passed: false,
            reason: 'Max position size per symbol exceeded',
          });
          
          // Update decision audit
          await pool.query(
            `UPDATE decision_audit 
             SET decision = 'BLOCK', block_reason = $1, gate_results = $2
             WHERE id = $3`,
            [
              decision.block_reason,
              JSON.stringify(decision.gate_results),
              decisionId,
            ]
          );
        } else {
          decision.gate_results.push({
            gate: 'Position Limits',
            passed: true,
          });
          
          // Set cooldowns
          await setSymbolCooldown(signal.symbol);
          await setSignalTypeCooldown(signal.signal_type);

          // Check if auto-trade is enabled and should handle execution
          const autoTradeEnabled = await autoTradeManager.getStatus();
          const shouldUseAutoTrade = autoTradeEnabled?.enabled && 
                                     autoTradeEnabled?.isRunning &&
                                     autoTradeEnabled?.mode !== 'SHADOW';

          if (shouldUseAutoTrade) {
            // Auto-trade orchestrator will handle execution
            // Signal already routed via signal processor
            console.log('[Decision] Signal routed to auto-trade orchestrator');
          } else {
            // Manual execution path
            if (isOptions && strikeSelection) {
              // Execute options trade
              await pool.query(
                `INSERT INTO options_positions (
                  decision_id, signal_id, symbol, strategy, timeframe_mode, direction,
                  status, contracts, entry_price, strike, expiration, option_type,
                  entry_iv, iv_rank, entry_dte, greeks, total_delta, total_gamma,
                  total_theta, total_vega, max_loss
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
                [
                  decisionId,
                  signal_id,
                  signal.symbol,
                  strikeSelection.strategy,
                  timeframe || 'SWING',
                  signal.direction,
                  'OPEN',
                  strikeSelection.primary.premium > 0 ? 1 : -1, // Simplified
                  strikeSelection.primary.premium,
                  strikeSelection.primary.strike,
                  strikeSelection.primary.expiration,
                  strikeSelection.primary.optionType,
                  strikeSelection.primary.quote.impliedVolatility,
                  50, // Would fetch
                  strikeSelection.primary.dte,
                  JSON.stringify({
                    delta: strikeSelection.primary.delta,
                    gamma: strikeSelection.primary.quote.gamma,
                    theta: strikeSelection.primary.quote.theta,
                    vega: strikeSelection.primary.quote.vega,
                  }),
                  strikeSelection.primary.delta,
                  strikeSelection.primary.quote.gamma,
                  strikeSelection.primary.quote.theta,
                  strikeSelection.primary.quote.vega,
                  strikeSelection.maxLoss,
                ]
              );
            } else {
              // Execute directional trade
              fetch(`${request.nextUrl.origin}/api/paper/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  decision_id: decisionId,
                  signal_id: signal_id,
                  symbol: signal.symbol,
                  direction: signal.direction,
                  entry_price: signal.entry_price,
                  stop_loss: signal.stop_loss,
                  take_profit_1: signal.take_profit_1,
                  quantity: decision.risk_calculation.quantity,
                }),
              }).catch(err => {
                console.error('Failed to execute paper trade:', err);
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      decision_id: decisionId,
      decision: decision.decision,
      trade_mode: decision.trade_mode,
      block_reason: decision.block_reason,
    });
  } catch (error: any) {
    console.error('Decision processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

