import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * Export signals to CSV
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const processed = searchParams.get('processed');

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    let query = 'SELECT * FROM signals_log WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (symbol) {
      query += ` AND symbol = $${paramIndex}`;
      params.push(symbol);
      paramIndex++;
    }

    if (processed !== null) {
      query += ` AND processed = $${paramIndex}`;
      params.push(processed === 'true');
      paramIndex++;
    }

    query += ' ORDER BY received_at DESC';

    const result = await pool.query(query, params);

    // Generate CSV
    const headers = [
      'ID', 'Symbol', 'Resolution', 'Timestamp', 'Signal Type',
      'Direction', 'Confidence', 'Signal Strength', 'Confluence Count',
      'Entry Price', 'Stop Loss', 'Take Profit 1', 'Active Signals',
      'Processed', 'Received At'
    ];

    const rows = result.rows.map((signal: any) => [
      signal.id,
      signal.symbol,
      signal.resolution,
      signal.timestamp,
      signal.signal_type,
      signal.direction,
      signal.confidence,
      signal.signal_strength,
      signal.confluence_count,
      signal.entry_price,
      signal.stop_loss,
      signal.take_profit_1,
      Array.isArray(signal.active_signals) 
        ? signal.active_signals.join(';')
        : JSON.parse(signal.active_signals || '[]').join(';'),
      signal.processed ? 'Yes' : 'No',
      signal.received_at,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="signals_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


