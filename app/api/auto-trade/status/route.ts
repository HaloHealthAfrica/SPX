import { NextResponse } from 'next/server'
import { autoTradeManager } from '@/lib/services/auto-trade-manager'

export async function GET() {
  try {
    await autoTradeManager.initialize()
    const status = await autoTradeManager.getStatus()
    
    if (!status) {
      return NextResponse.json({
        enabled: false,
        mode: 'PAPER',
        isRunning: false,
        isPaused: false,
        dailyTrades: 0,
        maxDailyTrades: 5,
        todayPnL: 0,
        dailyDrawdown: 0,
        maxDailyDrawdown: 2500,
        signalsGenerated: 0,
        tradesExecuted: 0,
        tradesBlocked: 0,
        tradesRemaining: 5,
        maxDrawdownReached: false,
        dailyLimitReached: false,
        openPositions: 0,
        totalExposure: 0,
      })
    }

    return NextResponse.json(status)
  } catch (error: any) {
    console.error('[API] Auto-trade status error:', error)
    // Return default status on error
    return NextResponse.json({
      enabled: false,
      mode: 'PAPER',
      isRunning: false,
      isPaused: false,
      dailyTrades: 0,
      maxDailyTrades: 5,
      todayPnL: 0,
      dailyDrawdown: 0,
      maxDailyDrawdown: 2500,
      signalsGenerated: 0,
      tradesExecuted: 0,
      tradesBlocked: 0,
      tradesRemaining: 5,
      maxDrawdownReached: false,
      dailyLimitReached: false,
      openPositions: 0,
      totalExposure: 0,
    })
  }
}

