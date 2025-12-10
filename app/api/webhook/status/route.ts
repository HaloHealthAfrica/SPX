import { NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * Check webhook activity - returns recent TradingView webhooks received
 */
export async function GET() {
  try {
    // Get recent webhooks (signals from signals_log table)
    const result = await pool.query(`
      SELECT 
        id,
        symbol,
        resolution,
        timestamp,
        signal_type,
        direction,
        confidence,
        entry_price,
        stop_loss,
        take_profit_1,
        received_at,
        processed,
        CASE 
          WHEN received_at > NOW() - INTERVAL '1 hour' THEN 'recent'
          WHEN received_at > NOW() - INTERVAL '24 hours' THEN 'today'
          ELSE 'older'
        END as time_category
      FROM signals_log
      ORDER BY received_at DESC
      LIMIT 100
    `);

    // Get summary statistics
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_signals,
        COUNT(*) FILTER (WHERE received_at > NOW() - INTERVAL '1 hour') as last_hour,
        COUNT(*) FILTER (WHERE received_at > NOW() - INTERVAL '24 hours') as last_24_hours,
        COUNT(*) FILTER (WHERE processed = true) as processed_count,
        COUNT(*) FILTER (WHERE processed = false) as pending_count,
        MAX(received_at) as last_received
      FROM signals_log
    `);

    const signals = result.rows.map(row => ({
      id: row.id,
      symbol: row.symbol,
      resolution: row.resolution,
      signal_type: row.signal_type,
      direction: row.direction,
      confidence: parseFloat(row.confidence),
      entry_price: parseFloat(row.entry_price),
      stop_loss: parseFloat(row.stop_loss),
      take_profit_1: parseFloat(row.take_profit_1),
      received_at: row.received_at,
      processed: row.processed,
      time_category: row.time_category,
      timestamp: row.timestamp,
    }));

    const stats = {
      total_signals: parseInt(statsResult.rows[0].total_signals),
      last_hour: parseInt(statsResult.rows[0].last_hour),
      last_24_hours: parseInt(statsResult.rows[0].last_24_hours),
      processed_count: parseInt(statsResult.rows[0].processed_count),
      pending_count: parseInt(statsResult.rows[0].pending_count),
      last_received: statsResult.rows[0].last_received,
    };

    return NextResponse.json({
      success: true,
      stats,
      signals,
      message: stats.last_received 
        ? `Last webhook received at ${stats.last_received}`
        : 'No webhooks received yet'
    });
  } catch (error: any) {
    console.error('[Webhook Status] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to check webhook status',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

