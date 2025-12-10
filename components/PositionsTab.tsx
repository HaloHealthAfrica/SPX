'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

async function fetchTrades(status: string) {
  const res = await fetch(`/api/paper/list?status=${status}`)
  if (!res.ok) throw new Error('Failed to fetch trades')
  return res.json()
}

async function fetchPrices() {
  const res = await fetch('/api/paper/prices')
  if (!res.ok) throw new Error('Failed to fetch prices')
  return res.json()
}

export default function PositionsTab() {
  const { data: openTrades, isLoading: openLoading } = useQuery({
    queryKey: ['trades', 'OPEN'],
    queryFn: () => fetchTrades('OPEN'),
    refetchInterval: 30000,
  })

  const { data: closedTrades, isLoading: closedLoading } = useQuery({
    queryKey: ['trades', 'CLOSED'],
    queryFn: () => fetchTrades('CLOSED'),
    refetchInterval: 30000,
  })

  // Fetch real-time prices for open positions
  const { data: pricesData, isLoading: pricesLoading } = useQuery({
    queryKey: ['prices'],
    queryFn: fetchPrices,
    refetchInterval: 10000, // Refresh every 10 seconds
    enabled: (openTrades?.trades || []).length > 0, // Only fetch if there are open positions
  })

  const pricesMap = new Map(
    (pricesData?.positions || []).map((p: any) => [p.trade_id, p])
  )

  if (openLoading || closedLoading) {
    return <div className="text-center py-8 text-gray-400">Loading...</div>
  }

  const open = openTrades?.trades || []
  const closed = closedTrades?.trades || []

  return (
    <div className="space-y-6">
      {/* Open Positions */}
      <div className="bg-dark-border/30 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-200">Open Positions</h2>
        {open.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No open positions</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-2 text-gray-400">Symbol</th>
                  <th className="text-left py-2 text-gray-400">Direction</th>
                  <th className="text-left py-2 text-gray-400">Entry</th>
                  <th className="text-left py-2 text-gray-400">Current</th>
                  <th className="text-left py-2 text-gray-400">P&L</th>
                  <th className="text-left py-2 text-gray-400">Stop Loss</th>
                  <th className="text-left py-2 text-gray-400">Take Profit</th>
                  <th className="text-left py-2 text-gray-400">Quantity</th>
                  <th className="text-left py-2 text-gray-400">Duration</th>
                </tr>
              </thead>
              <tbody>
                {open.map((trade: any) => {
                  const enteredAt = new Date(trade.entered_at)
                  const duration = Math.floor((Date.now() - enteredAt.getTime()) / 60000)
                  const priceData = pricesMap.get(trade.id) as any
                  
                  return (
                    <tr key={trade.id} className="border-b border-dark-border/50">
                      <td className="py-2 text-gray-300">{trade.symbol}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          trade.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="py-2 text-gray-300">${trade.entry_price?.toFixed(2)}</td>
                      <td className="py-2 text-gray-300">
                        {priceData?.current_price ? `$${priceData.current_price.toFixed(2)}` : pricesLoading ? '...' : 'N/A'}
                      </td>
                      <td className={`py-2 font-semibold ${
                        priceData?.current_pnl 
                          ? (priceData.current_pnl >= 0 ? 'text-green-400' : 'text-red-400')
                          : 'text-gray-400'
                      }`}>
                        {priceData?.current_pnl !== null && priceData?.current_pnl !== undefined
                          ? `$${priceData.current_pnl.toFixed(2)} (${priceData.pnl_percent?.toFixed(2) || '0.00'}%)`
                          : pricesLoading ? '...' : 'N/A'}
                      </td>
                      <td className="py-2 text-gray-300">${trade.stop_loss?.toFixed(2)}</td>
                      <td className="py-2 text-gray-300">${trade.take_profit_1?.toFixed(2)}</td>
                      <td className="py-2 text-gray-300">{trade.quantity}</td>
                      <td className="py-2 text-gray-300">{duration}m</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Closed Positions */}
      <div className="bg-dark-border/30 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-200">Closed Positions</h2>
          <a
            href="/api/export/trades?status=CLOSED"
            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors text-sm"
            download
          >
            Export CSV
          </a>
        </div>
        {closed.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No closed positions</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-2 text-gray-400">Symbol</th>
                  <th className="text-left py-2 text-gray-400">Direction</th>
                  <th className="text-left py-2 text-gray-400">Entry</th>
                  <th className="text-left py-2 text-gray-400">Exit</th>
                  <th className="text-left py-2 text-gray-400">P&L</th>
                  <th className="text-left py-2 text-gray-400">R-Multiple</th>
                  <th className="text-left py-2 text-gray-400">Exit Reason</th>
                  <th className="text-left py-2 text-gray-400">Duration</th>
                </tr>
              </thead>
              <tbody>
                {closed.map((trade: any) => (
                  <tr key={trade.id} className="border-b border-dark-border/50">
                    <td className="py-2 text-gray-300">{trade.symbol}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        trade.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.direction}
                      </span>
                    </td>
                    <td className="py-2 text-gray-300">${trade.entry_price?.toFixed(2)}</td>
                    <td className="py-2 text-gray-300">${trade.exit_price?.toFixed(2)}</td>
                    <td className={`py-2 font-semibold ${
                      (trade.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${(trade.pnl || 0).toFixed(2)}
                    </td>
                    <td className={`py-2 ${
                      (trade.r_multiple || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {(trade.r_multiple || 0).toFixed(2)}R
                    </td>
                    <td className="py-2 text-gray-300">{trade.exit_reason || '-'}</td>
                    <td className="py-2 text-gray-300">{trade.duration_minutes || 0}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

