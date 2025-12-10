import { NextResponse } from 'next/server'
import { autoTradeManager } from '@/lib/services/auto-trade-manager'

export async function POST() {
  try {
    const orchestrator = autoTradeManager.getOrchestrator()
    if (!orchestrator) {
      return NextResponse.json(
        { error: 'Orchestrator not initialized' },
        { status: 400 }
      )
    }
    await orchestrator.pause()
    return NextResponse.json({ success: true, message: 'Auto-trade paused' })
  } catch (error: any) {
    console.error('[API] Auto-trade pause error:', error)
    return NextResponse.json(
      { error: 'Failed to pause', details: error.message },
      { status: 500 }
    )
  }
}


