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
    await orchestrator.killSwitch()
    return NextResponse.json({ success: true, message: 'Kill switch activated' })
  } catch (error: any) {
    console.error('[API] Kill switch error:', error)
    return NextResponse.json(
      { error: 'Failed to activate kill switch', details: error.message },
      { status: 500 }
    )
  }
}


