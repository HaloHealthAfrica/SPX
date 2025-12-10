'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

async function fetchPerformance() {
  const res = await fetch('/api/analytics/performance')
  if (!res.ok) throw new Error('Failed to fetch performance')
  return res.json()
}

async function fetchDailyPerformance() {
  const res = await fetch('/api/paper/list?status=CLOSED')
  if (!res.ok) throw new Error('Failed to fetch trades')
  return res.json()
}

export default function AnalyticsTab() {
  const { data: performance, isLoading: perfLoading } = useQuery({
    queryKey: ['performance'],
    queryFn: fetchPerformance,
    refetchInterval: 30000,
  })

  const { data: tradesData, isLoading: tradesLoading } = useQuery({
    queryKey: ['trades', 'CLOSED'],
    queryFn: fetchDailyPerformance,
    refetchInterval: 30000,
  })

  if (perfLoading || tradesLoading) {
    return <div className="text-center py-8 text-gray-400">Loading...</div>
  }

  const modeWinRates = performance?.modeWinRates || {}
  const modeStats = performance?.modeStats || {}
  const trades = tradesData?.trades || []
  const signalCombos = performance?.signalCombinations || []

  // Calculate daily performance
  const dailyPnL: Record<string, number> = {}
  trades.forEach((trade: any) => {
    if (trade.exited_at) {
      const date = new Date(trade.exited_at).toISOString().split('T')[0]
      dailyPnL[date] = (dailyPnL[date] || 0) + (trade.pnl || 0)
    }
  })

  const dailyData = Object.entries(dailyPnL)
    .map(([date, pnl]) => ({ date, pnl }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const modeData = Object.entries(modeWinRates).map(([mode, winRate]) => ({
    mode,
    winRate: Number(winRate),
    total: modeStats[mode]?.total || 0,
    totalPnL: modeStats[mode]?.totalPnL || 0,
  }))

  return (
    <div className="space-y-6">
      {/* Performance by Mode */}
      <div className="bg-dark-border/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Performance by Mode</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={modeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2338" />
            <XAxis dataKey="mode" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{ backgroundColor: '#131829', border: '1px solid #1e2338' }}
            />
            <Legend />
            <Bar dataKey="winRate" fill="#06b6d4" name="Win Rate %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Performance */}
      <div className="bg-dark-border/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Daily Performance</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2338" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{ backgroundColor: '#131829', border: '1px solid #1e2338' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="pnl"
              stroke="#06b6d4"
              strokeWidth={2}
              name="Daily P&L"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Mode Statistics Table */}
      <div className="bg-dark-border/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Mode Statistics</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 text-gray-400">Mode</th>
                <th className="text-left py-2 text-gray-400">Total Trades</th>
                <th className="text-left py-2 text-gray-400">Wins</th>
                <th className="text-left py-2 text-gray-400">Losses</th>
                <th className="text-left py-2 text-gray-400">Win Rate</th>
                <th className="text-left py-2 text-gray-400">Total P&L</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(modeStats).map(([mode, stats]: [string, any]) => (
                <tr key={mode} className="border-b border-dark-border/50">
                  <td className="py-2 text-gray-300">{mode}</td>
                  <td className="py-2 text-gray-300">{stats.total}</td>
                  <td className="py-2 text-green-400">{stats.wins}</td>
                  <td className="py-2 text-red-400">{stats.losses}</td>
                  <td className="py-2 text-gray-300">
                    {stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0}%
                  </td>
                  <td className={`py-2 font-semibold ${
                    stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ${stats.totalPnL?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

