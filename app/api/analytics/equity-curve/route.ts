import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    // Get equity curve data (last 30 days)
    const result = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        SUM(pnl) OVER (ORDER BY created_at) as cumulative_pnl
      FROM paper_trades
      WHERE status = 'CLOSED'
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY created_at
    `)

    const initialEquity = 100000
    const data = result.rows.map((row, index) => ({
      date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      equity: initialEquity + Number(row.cumulative_pnl || 0),
      drawdown: 0, // TODO: Calculate drawdown
    }))

    // If no data, return empty array with today's date
    if (data.length === 0) {
      return NextResponse.json({
        data: [{
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          equity: initialEquity,
          drawdown: 0,
        }],
      })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('[API] Equity curve error:', error)
    // Return default equity curve on error
    const initialEquity = 100000
    return NextResponse.json({
      data: [{
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        equity: initialEquity,
        drawdown: 0,
      }],
    })
  }
}

