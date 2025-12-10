import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        metrics: {
          totalPnL: 0,
          winRate: 0,
          avgRMultiple: 0,
          activePositions: 0,
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
        },
        modeStats: {},
        modeWinRates: {},
        equityCurve: [],
      });
    }

    // Get all closed trades
    const tradesResult = await pool.query(
      `SELECT pt.*, da.trade_mode
       FROM paper_trades pt
       LEFT JOIN decision_audit da ON pt.decision_id = da.id
       WHERE pt.status = 'CLOSED'`
    );

    const trades = tradesResult.rows;
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = trades.filter(t => (t.pnl || 0) <= 0);

    const totalPnL = trades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const avgRMultiple = totalTrades > 0
      ? trades.reduce((sum, t) => sum + (Number(t.r_multiple) || 0), 0) / totalTrades
      : 0;

    // Get open positions
    const openResult = await pool.query(
      "SELECT COUNT(*) as count FROM paper_trades WHERE status = 'OPEN'"
    );
    const activePositions = parseInt(openResult.rows[0].count);

    // Performance by mode
    const modeStats: Record<string, any> = {};
    trades.forEach(trade => {
      const mode = trade.trade_mode || 'UNKNOWN';
      if (!modeStats[mode]) {
        modeStats[mode] = {
          total: 0,
          wins: 0,
          losses: 0,
          totalPnL: 0,
        };
      }
      modeStats[mode].total++;
      if ((trade.pnl || 0) > 0) {
        modeStats[mode].wins++;
      } else {
        modeStats[mode].losses++;
      }
      modeStats[mode].totalPnL += Number(trade.pnl) || 0;
    });

    // Calculate win rates by mode
    const modeWinRates: Record<string, number> = {};
    Object.keys(modeStats).forEach(mode => {
      const stats = modeStats[mode];
      modeWinRates[mode] = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
    });

    // Equity curve data
    const equityCurve = trades
      .sort((a, b) => new Date(a.exited_at).getTime() - new Date(b.exited_at).getTime())
      .reduce((acc: any[], trade, index) => {
        const prevEquity = index > 0 ? acc[index - 1].equity : 0;
        acc.push({
          date: trade.exited_at,
          equity: prevEquity + (Number(trade.pnl) || 0),
          pnl: trade.pnl,
        });
        return acc;
      }, []);

    // Signal combination analysis
    const signalCombosResult = await pool.query(
      `SELECT 
         sl.active_signals,
         COUNT(pt.id) as trade_count,
         SUM(CASE WHEN pt.pnl > 0 THEN 1 ELSE 0 END) as wins,
         SUM(CASE WHEN pt.pnl <= 0 THEN 1 ELSE 0 END) as losses,
         SUM(pt.pnl) as total_pnl,
         AVG(pt.r_multiple) as avg_r_multiple
       FROM paper_trades pt
       JOIN signals_log sl ON pt.signal_id = sl.id
       WHERE pt.status = 'CLOSED'
       GROUP BY sl.active_signals
       ORDER BY trade_count DESC
       LIMIT 20`
    );

    const signalCombos = signalCombosResult.rows.map((row: any) => {
      const signals = Array.isArray(row.active_signals) ? row.active_signals : JSON.parse(row.active_signals || '[]');
      return {
        signals: signals.sort().join(' + '), // Sort for consistency
        trade_count: parseInt(row.trade_count),
        wins: parseInt(row.wins),
        losses: parseInt(row.losses),
        win_rate: row.trade_count > 0 ? (row.wins / row.trade_count) * 100 : 0,
        total_pnl: parseFloat(row.total_pnl || 0),
        avg_r_multiple: parseFloat(row.avg_r_multiple || 0),
      };
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalPnL,
        winRate,
        avgRMultiple,
        activePositions,
        totalTrades,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
      },
      modeStats,
      modeWinRates,
      equityCurve,
      signalCombinations: signalCombos,
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

