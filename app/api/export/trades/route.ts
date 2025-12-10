import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * Export trades to CSV
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';
    const symbol = searchParams.get('symbol');

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    let query = 'SELECT * FROM paper_trades WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status !== 'ALL') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (symbol) {
      query += ` AND symbol = $${paramIndex}`;
      params.push(symbol);
      paramIndex++;
    }

    query += ' ORDER BY entered_at DESC';

    const result = await pool.query(query, params);

    // Generate CSV
    const headers = [
      'ID', 'Symbol', 'Direction', 'Entry Price', 'Exit Price',
      'Quantity', 'Stop Loss', 'Take Profit 1', 'Status',
      'P&L', 'R-Multiple', 'Exit Reason', 'Duration (min)',
      'Entered At', 'Exited At'
    ];

    const rows = result.rows.map((trade: any) => [
      trade.id,
      trade.symbol,
      trade.direction,
      trade.entry_price,
      trade.exit_price || '',
      trade.quantity,
      trade.stop_loss,
      trade.take_profit_1,
      trade.status,
      trade.pnl || '',
      trade.r_multiple || '',
      trade.exit_reason || '',
      trade.duration_minutes || '',
      trade.entered_at,
      trade.exited_at || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="trades_${status}_${new Date().toISOString().split('T')[0]}.csv"`,
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


