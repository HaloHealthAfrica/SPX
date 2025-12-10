import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPrice } from '@/lib/market-data';
import pool from '@/lib/db';

/**
 * Cron job endpoint for monitoring trades
 * Can be called by:
 * - Vercel Cron Jobs
 * - External cron service (cron-job.org, etc.)
 * - Scheduled task
 * 
 * Usage: Set up to run every 1-5 minutes
 */

export async function GET(request: NextRequest) {
  // Verify cron secret (if using Vercel Cron)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all open trades
    const openTradesResult = await pool.query(
      `SELECT * FROM paper_trades WHERE status = 'OPEN' ORDER BY entered_at DESC`
    );

    const closedTrades: any[] = [];
    const failedTrades: any[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (const trade of openTradesResult.rows) {
      try {
        const currentPrice = await getCurrentPrice(trade.symbol);
        let shouldClose = false;
        let exitPrice = 0;
        let exitReason = '';

        // Check stop loss
        if (trade.direction === 'LONG' && currentPrice <= trade.stop_loss) {
          shouldClose = true;
          exitPrice = trade.stop_loss;
          exitReason = 'STOP_LOSS';
        } else if (trade.direction === 'SHORT' && currentPrice >= trade.stop_loss) {
          shouldClose = true;
          exitPrice = trade.stop_loss;
          exitReason = 'STOP_LOSS';
        }
        // Check take profit levels
        else if (trade.direction === 'LONG' && currentPrice >= trade.take_profit_1) {
          shouldClose = true;
          exitPrice = trade.take_profit_1;
          exitReason = 'TAKE_PROFIT_1';
          if (trade.take_profit_2 && currentPrice >= trade.take_profit_2) {
            exitPrice = trade.take_profit_2;
            exitReason = 'TAKE_PROFIT_2';
          }
          if (trade.take_profit_3 && currentPrice >= trade.take_profit_3) {
            exitPrice = trade.take_profit_3;
            exitReason = 'TAKE_PROFIT_3';
          }
        } else if (trade.direction === 'SHORT' && currentPrice <= trade.take_profit_1) {
          shouldClose = true;
          exitPrice = trade.take_profit_1;
          exitReason = 'TAKE_PROFIT_1';
          if (trade.take_profit_2 && currentPrice <= trade.take_profit_2) {
            exitPrice = trade.take_profit_2;
            exitReason = 'TAKE_PROFIT_2';
          }
          if (trade.take_profit_3 && currentPrice <= trade.take_profit_3) {
            exitPrice = trade.take_profit_3;
            exitReason = 'TAKE_PROFIT_3';
          }
        }

        // Check for end-of-day close (if market is closed)
        const now = new Date();
        const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const hour = etTime.getHours();
        const day = etTime.getDay();
        const isMarketClosed = day === 0 || day === 6 || hour >= 16 || hour < 9;

        if (isMarketClosed && !shouldClose) {
          // Close all positions at end of day
          shouldClose = true;
          exitPrice = currentPrice;
          exitReason = 'END_OF_DAY';
        }

        if (shouldClose) {
          // Calculate PnL
          const priceDiff = trade.direction === 'LONG' 
            ? exitPrice - trade.entry_price
            : trade.entry_price - exitPrice;
          const pnl = priceDiff * trade.quantity;
          const risk = Math.abs(trade.entry_price - trade.stop_loss) * trade.quantity;
          const rMultiple = risk > 0 ? pnl / risk : 0;

          // Calculate duration
          const enteredAt = new Date(trade.entered_at);
          const exitedAt = new Date();
          const durationMinutes = Math.floor((exitedAt.getTime() - enteredAt.getTime()) / 60000);

          // Update trade
          await pool.query(
            `UPDATE paper_trades 
             SET status = 'CLOSED', exit_price = $1, exit_reason = $2,
                 pnl = $3, r_multiple = $4, duration_minutes = $5, exited_at = $6
             WHERE id = $7`,
            [exitPrice, exitReason, pnl, rMultiple, durationMinutes, exitedAt, trade.id]
          );

          // Update daily limits
          await pool.query(
            `UPDATE daily_limits 
             SET daily_pnl = daily_pnl + $1,
                 max_drawdown = LEAST(max_drawdown, daily_pnl + $1)
             WHERE trade_date = $2`,
            [pnl, today]
          );

          closedTrades.push({
            trade_id: trade.id,
            symbol: trade.symbol,
            exit_reason: exitReason,
            pnl: pnl,
            r_multiple: rMultiple,
          });
        }
      } catch (error: any) {
        console.error(`Error processing trade ${trade.id}:`, error);
        failedTrades.push({
          trade_id: trade.id,
          symbol: trade.symbol,
          error: error.message,
        });
        // Continue with next trade
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checked: openTradesResult.rows.length,
      closed: closedTrades.length,
      failed: failedTrades.length,
      closed_trades: closedTrades,
      failed_trades: failedTrades,
      summary: {
        total: openTradesResult.rows.length,
        successful: closedTrades.length,
        failed: failedTrades.length,
        remaining: openTradesResult.rows.length - closedTrades.length - failedTrades.length,
      },
    });
  } catch (error: any) {
    console.error('Cron monitoring error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

