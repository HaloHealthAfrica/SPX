import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    // Get options positions
    const optionsResult = await pool.query(`
      SELECT 
        id,
        symbol,
        strategy,
        timeframe_mode,
        direction,
        status,
        contracts,
        entry_price,
        strike,
        expiration,
        option_type,
        entry_iv,
        iv_rank,
        entry_dte,
        greeks,
        total_delta,
        total_gamma,
        total_theta,
        total_vega,
        max_loss,
        created_at
      FROM options_positions
      WHERE status = 'OPEN'
      ORDER BY created_at DESC
    `)

    // Get paper trades
    const paperResult = await pool.query(`
      SELECT 
        id,
        symbol,
        direction,
        quantity,
        entry_price,
        current_price,
        stop_loss,
        take_profit_1,
        status,
        pnl,
        created_at
      FROM paper_trades
      WHERE status = 'OPEN'
      ORDER BY created_at DESC
    `)

    const positions = [
      ...optionsResult.rows.map(row => ({
        id: row.id,
        symbol: row.symbol,
        strategy: row.strategy,
        timeframe_mode: row.timeframe_mode,
        direction: row.direction,
        contracts: row.contracts,
        quantity: row.contracts,
        entry_price: row.entry_price,
        current_price: row.entry_price, // TODO: Fetch real-time price
        pnl: 0, // TODO: Calculate from current price
        total_delta: row.total_delta,
        total_gamma: row.total_gamma,
        total_theta: row.total_theta,
        total_vega: row.total_vega,
        entry_dte: row.entry_dte,
        created_at: row.created_at,
      })),
      ...paperResult.rows.map(row => ({
        id: row.id,
        symbol: row.symbol,
        strategy: 'DIRECTIONAL',
        timeframe_mode: 'SWING',
        direction: row.direction,
        contracts: null,
        quantity: row.quantity,
        entry_price: row.entry_price,
        current_price: row.current_price || row.entry_price,
        pnl: row.pnl || 0,
        total_delta: null,
        total_gamma: null,
        total_theta: null,
        total_vega: null,
        entry_dte: null,
        created_at: row.created_at,
      })),
    ]

    return NextResponse.json({ positions })
  } catch (error: any) {
    console.error('[API] Positions error:', error)
    // Return empty array on error
    return NextResponse.json({ positions: [] })
  }
}

