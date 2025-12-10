import { NextResponse } from 'next/server'
import { autoTradeManager } from '@/lib/services/auto-trade-manager'

export async function POST() {
  try {
    await autoTradeManager.start()
    return NextResponse.json({ success: true, message: 'Auto-trade started' })
  } catch (error: any) {
    console.error('[API] Auto-trade start error:', error)
    return NextResponse.json(
      { error: 'Failed to start', details: error.message },
      { status: 500 }
    )
  }
}


