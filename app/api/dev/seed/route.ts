import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const SYMBOLS = ['SPX', 'ES', 'SPY', 'AVGO'];
const SIGNAL_TYPES = ['STRAT_212', 'BOS', 'SMT', 'SWEEP_LOW', 'SWEEP_HIGH', 'FVG', 'DISPLACEMENT', 'ORB', 'VOLUME_SURGE', 'MSS', 'CHoCH', 'BREAKER'];
const DIRECTIONS = ['LONG', 'SHORT'];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomSignals(count: number): string[] {
  const signals: string[] = [];
  const used = new Set<string>();
  while (signals.length < count && signals.length < SIGNAL_TYPES.length) {
    const signal = getRandomElement(SIGNAL_TYPES);
    if (!used.has(signal)) {
      signals.push(signal);
      used.add(signal);
    }
  }
  return signals;
}

function generateBasePrice(symbol: string): number {
  const basePrices: Record<string, number> = {
    SPX: 4500,
    ES: 4500,
    SPY: 450,
    AVGO: 1200,
  };
  return basePrices[symbol] || 1000;
}

export async function POST(request: NextRequest) {
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Generate 5 days of data
      const today = new Date();
      const signals: any[] = [];
      const decisions: any[] = [];
      const trades: any[] = [];

      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const tradeDate = new Date(today);
        tradeDate.setDate(tradeDate.getDate() - dayOffset);
        const dateStr = tradeDate.toISOString().split('T')[0];

        // Create daily limit record
        await client.query(
          `INSERT INTO daily_limits (trade_date, trades_count, daily_pnl, max_drawdown, breached)
           VALUES ($1, 0, 0, 0, false)
           ON CONFLICT (trade_date) DO NOTHING`,
          [dateStr]
        );

        // Generate 5 signals per symbol per day
        for (const symbol of SYMBOLS) {
          for (let i = 0; i < 5; i++) {
            const basePrice = generateBasePrice(symbol);
            const direction = getRandomElement(DIRECTIONS);
            const activeSignals = getRandomSignals(Math.floor(Math.random() * 4) + 2);
            const confidence = 5.5 + Math.random() * 4.5; // 5.5 to 10
            const confluenceCount = activeSignals.length;
            
            const entryPrice = basePrice + (Math.random() - 0.5) * basePrice * 0.02;
            const stopLoss = direction === 'LONG' 
              ? entryPrice - basePrice * 0.01
              : entryPrice + basePrice * 0.01;
            const takeProfit1 = direction === 'LONG'
              ? entryPrice + basePrice * 0.02
              : entryPrice - basePrice * 0.02;

            const timestamp = new Date(tradeDate).getTime() + i * 3600000; // 1 hour apart

            // Insert signal
            const signalResult = await client.query(
              `INSERT INTO signals_log (
                symbol, resolution, timestamp, signal_type, direction,
                confidence, signal_strength, confluence_count,
                entry_price, stop_loss, take_profit_1, active_signals, processed
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
              RETURNING id`,
              [
                symbol,
                '1D',
                timestamp,
                getRandomElement(activeSignals),
                direction,
                confidence,
                confidence,
                confluenceCount,
                entryPrice,
                stopLoss,
                takeProfit1,
                JSON.stringify(activeSignals),
                true,
              ]
            );

            const signalId = signalResult.rows[0].id;
            signals.push({ id: signalId, symbol, direction });

            // 75% trade rate
            const shouldTrade = Math.random() < 0.75;
            const decision = shouldTrade ? 'TRADE' : 'BLOCK';
            const tradeMode = shouldTrade 
              ? getRandomElement(['TREND', 'REVERSAL', 'BREAKOUT'])
              : null;

            const gateResults = [
              { gate: 'Signal Integrity', passed: true },
              { gate: 'Session & Volatility', passed: true },
              { gate: 'Signal Factorization', passed: true, score: 7.5 },
              { gate: 'Role Assignment', passed: true },
              { gate: 'Weighted Score & Mode', passed: true, score: 2.5 },
              { gate: 'Risk & Position Sizing', passed: true },
              { gate: 'Daily Limits', passed: true },
            ];

            // Insert decision
            const decisionResult = await client.query(
              `INSERT INTO decision_audit (
                signal_id, decision, trade_mode, block_reason,
                gate_results, signals, score_breakdown, regime, risk_calculation
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              RETURNING id`,
              [
                signalId,
                decision,
                tradeMode,
                decision === 'BLOCK' ? 'Random block for testing' : null,
                JSON.stringify(gateResults),
                JSON.stringify({
                  primary: activeSignals[0],
                  confirmations: activeSignals.slice(1, 3),
                }),
                JSON.stringify({
                  total: 7.5,
                  by_family: {
                    market_structure: 2.5,
                    liquidity: 2.0,
                    order_flow: 3.0,
                  },
                }),
                JSON.stringify({ session: 'REGULAR' }),
                JSON.stringify({
                  base_risk: 1000,
                  adjusted_risk: tradeMode === 'REVERSAL' ? 500 : 1000,
                  quantity: Math.floor(1000 / Math.abs(entryPrice - stopLoss)),
                  risk_reward: 2.5,
                }),
              ]
            );

            const decisionId = decisionResult.rows[0].id;
            decisions.push({ id: decisionId, decision, tradeMode });

            // If TRADE, create paper trade (60% win rate)
            if (decision === 'TRADE') {
              const quantity = Math.floor(1000 / Math.abs(entryPrice - stopLoss));
              const priceDiff = takeProfit1 - entryPrice;
              const takeProfit2 = takeProfit1 + priceDiff * 0.5;
              const takeProfit3 = takeProfit1 + priceDiff;

              const enteredAt = new Date(timestamp);
              const isWin = Math.random() < 0.6;
              const isOpen = dayOffset === 0 && i === 0; // One open per symbol on most recent day

              let exitPrice = 0;
              let exitReason = '';
              let pnl = 0;
              let rMultiple = 0;
              let durationMinutes = 0;
              let exitedAt: Date | null = null;

              if (!isOpen) {
                if (isWin) {
                  exitPrice = direction === 'LONG'
                    ? takeProfit1 + Math.random() * (takeProfit3 - takeProfit1)
                    : takeProfit1 - Math.random() * (takeProfit1 - takeProfit3);
                  exitReason = 'TAKE_PROFIT_1';
                  if (exitPrice >= takeProfit2) exitReason = 'TAKE_PROFIT_2';
                  if (exitPrice >= takeProfit3) exitReason = 'TAKE_PROFIT_3';
                } else {
                  exitPrice = stopLoss;
                  exitReason = 'STOP_LOSS';
                }

                const priceDiff2 = direction === 'LONG' 
                  ? exitPrice - entryPrice
                  : entryPrice - exitPrice;
                pnl = priceDiff2 * quantity;
                const risk = Math.abs(entryPrice - stopLoss) * quantity;
                rMultiple = risk > 0 ? pnl / risk : 0;

                exitedAt = new Date(enteredAt);
                exitedAt.setMinutes(exitedAt.getMinutes() + Math.floor(Math.random() * 240) + 30);
                durationMinutes = Math.floor((exitedAt.getTime() - enteredAt.getTime()) / 60000);
              }

              const tradeResult = await client.query(
                `INSERT INTO paper_trades (
                  decision_id, signal_id, symbol, direction,
                  entry_price, quantity, stop_loss,
                  take_profit_1, take_profit_2, take_profit_3,
                  status, exit_price, exit_reason, pnl, r_multiple,
                  duration_minutes, entered_at, exited_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                RETURNING id`,
                [
                  decisionId,
                  signalId,
                  symbol,
                  direction,
                  entryPrice,
                  quantity,
                  stopLoss,
                  takeProfit1,
                  takeProfit2,
                  takeProfit3,
                  isOpen ? 'OPEN' : 'CLOSED',
                  exitPrice || null,
                  exitReason || null,
                  pnl || null,
                  rMultiple || null,
                  durationMinutes || null,
                  enteredAt,
                  exitedAt,
                ]
              );

              trades.push({ id: tradeResult.rows[0].id, status: isOpen ? 'OPEN' : 'CLOSED' });

              // Update daily limits
              if (!isOpen) {
                await client.query(
                  `UPDATE daily_limits 
                   SET trades_count = trades_count + 1,
                       daily_pnl = daily_pnl + $1,
                       max_drawdown = LEAST(max_drawdown, daily_pnl + $1)
                   WHERE trade_date = $2`,
                  [pnl, dateStr]
                );
              } else {
                await client.query(
                  `UPDATE daily_limits 
                   SET trades_count = trades_count + 1
                   WHERE trade_date = $2`,
                  [dateStr]
                );
              }
            }
          }
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Seed data created successfully',
        counts: {
          signals: signals.length,
          decisions: decisions.length,
          trades: trades.length,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


