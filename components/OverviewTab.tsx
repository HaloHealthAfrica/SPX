'use client'

import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

async function fetchPerformance() {
  const res = await fetch('/api/analytics/performance')
  if (!res.ok) throw new Error('Failed to fetch performance')
  return res.json()
}

async function fetchRecentDecisions() {
  const res = await fetch('/api/decisions?limit=10')
  if (!res.ok) throw new Error('Failed to fetch decisions')
  return res.json()
}

export default function OverviewTab() {
  const { data: performance, isLoading: perfLoading } = useQuery({
    queryKey: ['performance'],
    queryFn: fetchPerformance,
    refetchInterval: 30000,
  })

  const { data: decisions, isLoading: decisionsLoading } = useQuery({
    queryKey: ['recent-decisions'],
    queryFn: fetchRecentDecisions,
    refetchInterval: 30000,
  })

  if (perfLoading || decisionsLoading) {
    return <div className="text-center py-8 text-gray-400">Loading...</div>
  }

  const metrics = performance?.metrics || {}
  const equityCurve = performance?.equityCurve || []
  const recentDecisions = decisions?.decisions || []

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total P&L"
          value={`$${metrics.totalPnL?.toFixed(2) || '0.00'}`}
          trend={metrics.totalPnL >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Win Rate"
          value={`${metrics.winRate?.toFixed(1) || '0.0'}%`}
          trend={metrics.winRate >= 50 ? 'up' : 'down'}
        />
        <MetricCard
          title="Avg R-Multiple"
          value={metrics.avgRMultiple?.toFixed(2) || '0.00'}
          trend={metrics.avgRMultiple >= 1 ? 'up' : 'down'}
        />
        <MetricCard
          title="Active Positions"
          value={metrics.activePositions || 0}
        />
      </div>

      {/* Equity Curve */}
      <div className="bg-dark-border/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Equity Curve</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={equityCurve}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2338" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), 'MM/dd')}
              stroke="#6b7280"
            />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{ backgroundColor: '#131829', border: '1px solid #1e2338' }}
              labelFormatter={(value) => format(new Date(value), 'MM/dd HH:mm')}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="equity"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              name="Equity"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Decisions */}
      <div className="bg-dark-border/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Recent Decisions</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 text-gray-400">Time</th>
                <th className="text-left py-2 text-gray-400">Symbol</th>
                <th className="text-left py-2 text-gray-400">Direction</th>
                <th className="text-left py-2 text-gray-400">Decision</th>
                <th className="text-left py-2 text-gray-400">Mode</th>
              </tr>
            </thead>
            <tbody>
              {recentDecisions.map((decision: any) => (
                <tr key={decision.id} className="border-b border-dark-border/50">
                  <td className="py-2 text-gray-300">
                    {format(new Date(decision.decided_at), 'MM/dd HH:mm')}
                  </td>
                  <td className="py-2 text-gray-300">{decision.symbol}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      decision.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {decision.direction}
                    </span>
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      decision.decision === 'TRADE' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {decision.decision}
                    </span>
                  </td>
                  <td className="py-2 text-gray-300">{decision.trade_mode || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, trend }: { title: string; value: string; trend?: 'up' | 'down' }) {
  const colorClass = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-300'
  
  return (
    <div className="bg-gradient-to-br from-dark-card to-dark-border/30 rounded-lg p-6 border border-dark-border">
      <div className="text-gray-400 text-sm mb-2">{title}</div>
      <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
    </div>
  )
}


