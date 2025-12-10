'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useState } from 'react'

async function fetchSignals(symbol?: string, processed?: string) {
  let url = '/api/signals/list?limit=100'
  if (symbol) url += `&symbol=${symbol}`
  if (processed) url += `&processed=${processed}`
  
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch signals')
  return res.json()
}

export default function SignalsTab() {
  const [symbolFilter, setSymbolFilter] = useState('')
  const [processedFilter, setProcessedFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['signals', symbolFilter, processedFilter],
    queryFn: () => fetchSignals(symbolFilter || undefined, processedFilter || undefined),
    refetchInterval: 30000,
  })

  if (isLoading) {
    return <div className="text-center py-8 text-gray-400">Loading...</div>
  }

  const signals = data?.signals || []

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
          className="bg-dark-border border border-dark-border rounded px-4 py-2 text-gray-300"
        >
          <option value="">All Symbols</option>
          <option value="SPX">SPX</option>
          <option value="ES">ES</option>
          <option value="SPY">SPY</option>
          <option value="AVGO">AVGO</option>
        </select>
        <select
          value={processedFilter}
          onChange={(e) => setProcessedFilter(e.target.value)}
          className="bg-dark-border border border-dark-border rounded px-4 py-2 text-gray-300"
        >
          <option value="">All</option>
          <option value="true">Processed</option>
          <option value="false">Unprocessed</option>
        </select>
      </div>

      {/* Signals Table */}
      <div className="bg-dark-border/30 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-200">Recent Signals</h2>
          <a
            href="/api/export/signals"
            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors text-sm"
            download
          >
            Export CSV
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 text-gray-400">Time</th>
                <th className="text-left py-2 text-gray-400">Symbol</th>
                <th className="text-left py-2 text-gray-400">Direction</th>
                <th className="text-left py-2 text-gray-400">Confidence</th>
                <th className="text-left py-2 text-gray-400">Confluence</th>
                <th className="text-left py-2 text-gray-400">Active Signals</th>
                <th className="text-left py-2 text-gray-400">Entry</th>
                <th className="text-left py-2 text-gray-400">Processed</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal: any) => (
                <tr key={signal.id} className="border-b border-dark-border/50">
                  <td className="py-2 text-gray-300">
                    {format(new Date(signal.received_at), 'MM/dd HH:mm')}
                  </td>
                  <td className="py-2 text-gray-300">{signal.symbol}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      signal.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {signal.direction}
                    </span>
                  </td>
                  <td className="py-2 text-gray-300">{signal.confidence?.toFixed(2)}</td>
                  <td className="py-2 text-gray-300">{signal.confluence_count}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {(signal.active_signals || []).slice(0, 3).map((sig: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-400">
                          {sig}
                        </span>
                      ))}
                      {(signal.active_signals || []).length > 3 && (
                        <span className="text-xs text-gray-500">+{(signal.active_signals || []).length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 text-gray-300">${signal.entry_price?.toFixed(2)}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      signal.processed ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {signal.processed ? 'Yes' : 'No'}
                    </span>
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

