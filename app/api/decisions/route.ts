import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ListDecisionsSchema, validateRequest } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        count: 0,
        decisions: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const params = {
      limit: parseInt(searchParams.get('limit') || '50'),
    };
    
    const validation = validateRequest(ListDecisionsSchema, params);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error },
        { status: 400 }
      );
    }

    const { limit, offset } = validation.data;

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM decision_audit`
    );
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Get paginated results
    const result = await pool.query(
      `SELECT da.*, sl.symbol, sl.direction, sl.entry_price
       FROM decision_audit da
       LEFT JOIN signals_log sl ON da.signal_id = sl.id
       ORDER BY da.decided_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      total,
      limit,
      offset,
      hasMore: (offset || 0) + result.rows.length < total,
      decisions: result.rows,
    });
  } catch (error: any) {
    console.error('List decisions error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

