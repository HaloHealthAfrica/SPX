import { NextResponse } from 'next/server'
import { autoTradeManager } from '@/lib/services/auto-trade-manager'

export async function POST() {
  try {
    await autoTradeManager.stop()
    return NextResponse.json({ success: true, message: 'Auto-trade stopped' })
  } catch (error: any) {
    console.error('[API] Auto-trade stop error:', error)
    return NextResponse.json(
      { error: 'Failed to stop', details: error.message },
      { status: 500 }
    )
  }
}


