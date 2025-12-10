import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ListTradesSchema, validateRequest } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        count: 0,
        trades: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const params = {
      status: searchParams.get('status') || 'ALL',
      symbol: searchParams.get('symbol'),
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };
    
    const validation = validateRequest(ListTradesSchema, params);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error },
        { status: 400 }
      );
    }

    const { status, symbol, limit, offset } = validation.data;

    // Build WHERE clause for count query
    let whereClause = 'WHERE 1=1';
    const whereParams: any[] = [];
    let paramIndex = 1;

    if (status !== 'ALL') {
      whereClause += ` AND status = $${paramIndex}`;
      whereParams.push(status);
      paramIndex++;
    }

    if (symbol) {
      whereClause += ` AND symbol = $${paramIndex}`;
      whereParams.push(symbol);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM paper_trades ${whereClause}`,
      whereParams
    );
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Get paginated results
    let query = `SELECT * FROM paper_trades ${whereClause} ORDER BY entered_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const queryParams = [...whereParams, limit, offset];

    const result = await pool.query(query, queryParams);

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      total,
      limit,
      offset,
      hasMore: (offset || 0) + result.rows.length < total,
      trades: result.rows,
    });
  } catch (error: any) {
    console.error('List trades error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

