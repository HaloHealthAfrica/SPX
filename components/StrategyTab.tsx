'use client'

import { useQuery } from '@tanstack/react-query'

async function fetchPerformance() {
  const res = await fetch('/api/analytics/performance')
  if (!res.ok) throw new Error('Failed to fetch performance')
  return res.json()
}

async function fetchTrades() {
  const res = await fetch('/api/paper/list?status=CLOSED')
  if (!res.ok) throw new Error('Failed to fetch trades')
  return res.json()
}

export default function StrategyTab() {
  const { data: performance, isLoading: perfLoading } = useQuery({
    queryKey: ['performance'],
    queryFn: fetchPerformance,
    refetchInterval: 30000,
  })

  const { data: tradesData, isLoading: tradesLoading } = useQuery({
    queryKey: ['trades', 'CLOSED'],
    queryFn: fetchTrades,
    refetchInterval: 30000,
  })

  if (perfLoading || tradesLoading) {
    return <div className="text-center py-8 text-gray-400">Loading...</div>
  }

  const trades = tradesData?.trades || []
  const modeStats = performance?.modeStats || {}

  // Calculate average holding time by mode
  const holdingTimeByMode: Record<string, { total: number; count: number }> = {}
  trades.forEach((trade: any) => {
    if (trade.duration_minutes && trade.trade_mode) {
      if (!holdingTimeByMode[trade.trade_mode]) {
        holdingTimeByMode[trade.trade_mode] = { total: 0, count: 0 }
      }
      holdingTimeByMode[trade.trade_mode].total += trade.duration_minutes
      holdingTimeByMode[trade.trade_mode].count += 1
    }
  })

  const avgHoldingTime = Object.entries(holdingTimeByMode).map(([mode, data]) => ({
    mode,
    avgMinutes: data.count > 0 ? Math.round(data.total / data.count) : 0,
  }))

  // Best/worst performing setups (simplified - would need signal analysis)
  const winningTrades = trades.filter((t: any) => (t.pnl || 0) > 0)
  const losingTrades = trades.filter((t: any) => (t.pnl || 0) <= 0)

  return (
    <div className="space-y-6">
      {/* Win/Loss Breakdown by Signal Family */}
      <div className="bg-dark-border/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Win/Loss Breakdown by Mode</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(modeStats).map(([mode, stats]: [string, any]) => {
            const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0
            return (
              <div key={mode} className="bg-dark-card rounded-lg p-4 border border-dark-border">
                <div className="text-gray-400 text-sm mb-2">{mode}</div>
                <div className="text-2xl font-bold text-cyan-400 mb-2">{winRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-400">
                  {stats.wins}W / {stats.losses}L ({stats.total} total)
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Average Holding Time by Mode */}
      <div className="bg-dark-border/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Average Holding Time by Mode</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 text-gray-400">Mode</th>
                <th className="text-left py-2 text-gray-400">Avg Duration (minutes)</th>
                <th className="text-left py-2 text-gray-400">Avg Duration (hours)</th>
              </tr>
            </thead>
            <tbody>
              {avgHoldingTime.map((item) => (
                <tr key={item.mode} className="border-b border-dark-border/50">
                  <td className="py-2 text-gray-300">{item.mode}</td>
                  <td className="py-2 text-gray-300">{item.avgMinutes}m</td>
                  <td className="py-2 text-gray-300">{(item.avgMinutes / 60).toFixed(1)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best/Worst Performing Setups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-dark-border/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-200">Best Performing Trades</h2>
          <div className="space-y-2">
            {winningTrades
              .sort((a: any, b: any) => (b.pnl || 0) - (a.pnl || 0))
              .slice(0, 5)
              .map((trade: any) => (
                <div key={trade.id} className="flex justify-between items-center py-2 border-b border-dark-border/50">
                  <div>
                    <div className="text-gray-300">{trade.symbol} {trade.direction}</div>
                    <div className="text-xs text-gray-500">{trade.exit_reason}</div>
                  </div>
                  <div className="text-green-400 font-semibold">
                    ${(trade.pnl || 0).toFixed(2)} ({(trade.r_multiple || 0).toFixed(2)}R)
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-dark-border/30 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-200">Worst Performing Trades</h2>
          <div className="space-y-2">
            {losingTrades
              .sort((a: any, b: any) => (a.pnl || 0) - (b.pnl || 0))
              .slice(0, 5)
              .map((trade: any) => (
                <div key={trade.id} className="flex justify-between items-center py-2 border-b border-dark-border/50">
                  <div>
                    <div className="text-gray-300">{trade.symbol} {trade.direction}</div>
                    <div className="text-xs text-gray-500">{trade.exit_reason}</div>
                  </div>
                  <div className="text-red-400 font-semibold">
                    ${(trade.pnl || 0).toFixed(2)} ({(trade.r_multiple || 0).toFixed(2)}R)
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}


