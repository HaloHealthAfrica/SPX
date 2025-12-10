import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ListSignalsSchema, validateRequest } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        count: 0,
        signals: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const params = {
      symbol: searchParams.get('symbol'),
      processed: searchParams.get('processed') === 'true' ? true : searchParams.get('processed') === 'false' ? false : undefined,
      limit: parseInt(searchParams.get('limit') || '100'),
    };
    
    const validation = validateRequest(ListSignalsSchema, params);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error },
        { status: 400 }
      );
    }

    const { symbol, processed, limit, offset } = validation.data;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const whereParams: any[] = [];
    let paramIndex = 1;

    if (symbol) {
      whereClause += ` AND symbol = $${paramIndex}`;
      whereParams.push(symbol);
      paramIndex++;
    }

    if (processed !== undefined) {
      whereClause += ` AND processed = $${paramIndex}`;
      whereParams.push(processed);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM signals_log ${whereClause}`,
      whereParams
    );
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Get paginated results
    let query = `SELECT * FROM signals_log ${whereClause} ORDER BY received_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const queryParams = [...whereParams, limit, offset];

    const result = await pool.query(query, queryParams);

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      total,
      limit,
      offset,
      hasMore: (offset || 0) + result.rows.length < total,
      signals: result.rows,
    });
  } catch (error: any) {
    console.error('List signals error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

