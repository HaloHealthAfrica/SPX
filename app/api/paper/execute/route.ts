import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ExecuteTradeSchema, validateRequest } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = validateRequest(ExecuteTradeSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error },
        { status: 400 }
      );
    }

    const {
      decision_id,
      signal_id,
      symbol,
      direction,
      entry_price,
      stop_loss,
      take_profit_1,
      quantity,
    } = validation.data;

    // Calculate additional take profit levels
    const priceDiff = take_profit_1 - entry_price;
    const take_profit_2 = take_profit_1 + priceDiff * 0.5;
    const take_profit_3 = take_profit_1 + priceDiff;

    // Insert paper trade
    const result = await pool.query(
      `INSERT INTO paper_trades (
        decision_id, signal_id, symbol, direction,
        entry_price, quantity, stop_loss,
        take_profit_1, take_profit_2, take_profit_3,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'OPEN')
      RETURNING id`,
      [
        decision_id,
        signal_id,
        symbol,
        direction,
        entry_price,
        quantity,
        stop_loss,
        take_profit_1,
        take_profit_2,
        take_profit_3,
      ]
    );

    const tradeId = result.rows[0].id;

    // Update daily limits
    const today = new Date().toISOString().split('T')[0];
    await pool.query(
      `UPDATE daily_limits 
       SET trades_count = trades_count + 1
       WHERE trade_date = $1`,
      [today]
    );

    return NextResponse.json({
      success: true,
      trade_id: tradeId,
      message: 'Paper trade executed',
    });
  } catch (error: any) {
    console.error('Paper trade execution error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

