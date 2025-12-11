import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET() {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      console.warn('[API] DATABASE_URL not configured');
      return NextResponse.json({ signals: [] });
    }

    // Get recent signals with decision details
    const result = await pool.query(`
      SELECT 
        s.id,
        s.symbol,
        s.signal_type,
        s.direction,
        s.confidence,
        s.active_signals,
        s.received_at as created_at,
        d.decision,
        d.block_reason,
        d.gate_results,
        d.score_breakdown,
        d.timeframe,
        d.strategy,
        d.risk_calculation
      FROM signals_log s
      LEFT JOIN decision_audit d ON s.id = d.signal_id
      ORDER BY s.received_at DESC
      LIMIT 50
    `)

    const signals = result.rows.map(row => ({
      id: row.id,
      symbol: row.symbol,
      signal_type: row.signal_type,
      direction: row.direction,
      confidence: row.confidence,
      active_signals: typeof row.active_signals === 'string' 
        ? JSON.parse(row.active_signals) 
        : row.active_signals || [],
      created_at: row.created_at,
      decision: row.decision,
      block_reason: row.block_reason,
      gateResults: typeof row.gate_results === 'string'
        ? JSON.parse(row.gate_results)
        : row.gate_results || [],
      score_breakdown: typeof row.score_breakdown === 'string'
        ? JSON.parse(row.score_breakdown)
        : row.score_breakdown || {},
      score: typeof row.score_breakdown === 'string'
        ? JSON.parse(row.score_breakdown)?.total || row.confidence
        : row.score_breakdown?.total || row.confidence,
      timeframe: row.timeframe,
      strategy: row.strategy,
    }))

    return NextResponse.json({ signals })
  } catch (error: any) {
    console.error('[API] Signals feed error:', error)
    console.error('[API] Error details:', {
      message: error.message,
      code: error.code,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
    })
    // Return empty array on error but log the issue
    return NextResponse.json({ 
      signals: [],
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

