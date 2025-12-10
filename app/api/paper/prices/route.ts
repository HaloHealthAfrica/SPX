import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentPrice } from '@/lib/market-data';

/**
 * Get current prices for open positions
 * Used by UI to show real-time P&L
 */
export async function GET(request: NextRequest) {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        positions: [],
      });
    }

    // Fetch all open positions
    const openTradesResult = await pool.query(
      `SELECT id, symbol, direction, entry_price, quantity, stop_loss, take_profit_1
       FROM paper_trades 
       WHERE status = 'OPEN' 
       ORDER BY entered_at DESC`
    );

    const positions = await Promise.all(
      openTradesResult.rows.map(async (trade) => {
        try {
          const currentPrice = await getCurrentPrice(trade.symbol);
          
          // Calculate current P&L
          const priceDiff = trade.direction === 'LONG'
            ? currentPrice - trade.entry_price
            : trade.entry_price - currentPrice;
          const currentPnL = priceDiff * trade.quantity;
          
          // Calculate unrealized P&L percentage
          const entryValue = trade.entry_price * trade.quantity;
          const pnlPercent = entryValue > 0 ? (currentPnL / entryValue) * 100 : 0;

          return {
            trade_id: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            entry_price: parseFloat(trade.entry_price),
            current_price: currentPrice,
            quantity: trade.quantity,
            current_pnl: currentPnL,
            pnl_percent: pnlPercent,
            stop_loss: parseFloat(trade.stop_loss),
            take_profit_1: parseFloat(trade.take_profit_1),
          };
        } catch (error: any) {
          console.error(`Error fetching price for ${trade.symbol}:`, error);
          return {
            trade_id: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            entry_price: parseFloat(trade.entry_price),
            current_price: null,
            quantity: trade.quantity,
            current_pnl: null,
            pnl_percent: null,
            error: 'Price fetch failed',
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      positions,
    });
  } catch (error: any) {
    console.error('Get prices error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


