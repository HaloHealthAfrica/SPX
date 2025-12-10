import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    // Get aggregate Greeks from options positions
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(total_delta), 0) as delta,
        COALESCE(SUM(total_gamma), 0) as gamma,
        COALESCE(SUM(total_theta), 0) as theta,
        COALESCE(SUM(total_vega), 0) as vega
      FROM options_positions
      WHERE status = 'OPEN'
    `)

    const greeks = {
      delta: Number(result.rows[0]?.delta || 0),
      gamma: Number(result.rows[0]?.gamma || 0),
      theta: Number(result.rows[0]?.theta || 0),
      vega: Number(result.rows[0]?.vega || 0),
    }

    return NextResponse.json(greeks)
  } catch (error: any) {
    console.error('[API] Portfolio Greeks error:', error)
    // Return zero Greeks on error
    return NextResponse.json({ delta: 0, gamma: 0, theta: 0, vega: 0 })
  }
}

