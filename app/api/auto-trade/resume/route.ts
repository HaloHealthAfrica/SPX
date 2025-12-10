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
    await orchestrator.resume()
    return NextResponse.json({ success: true, message: 'Auto-trade resumed' })
  } catch (error: any) {
    console.error('[API] Auto-trade resume error:', error)
    return NextResponse.json(
      { error: 'Failed to resume', details: error.message },
      { status: 500 }
    )
  }
}


