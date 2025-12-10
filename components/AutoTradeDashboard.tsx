'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PieChart, Pie, Cell } from 'recharts'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ============================================================================
// API HOOKS
// ============================================================================

function useAutoTradeStatus() {
  return useQuery({
    queryKey: ['autoTrade', 'status'],
    queryFn: async () => {
      const res = await fetch('/api/auto-trade/status')
      if (!res.ok) throw new Error('Failed to fetch status')
      return res.json()
    },
    refetchInterval: 2000,
  })
}

function useSignalsFeed() {
  return useQuery({
    queryKey: ['signals', 'feed'],
    queryFn: async () => {
      const res = await fetch('/api/signals/feed')
      if (!res.ok) throw new Error('Failed to fetch signals')
      return res.json()
    },
    refetchInterval: 5000,
  })
}

function usePositions() {
  return useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const res = await fetch('/api/positions')
      if (!res.ok) throw new Error('Failed to fetch positions')
      return res.json()
    },
    refetchInterval: 10000,
  })
}

function usePortfolioGreeks() {
  return useQuery({
    queryKey: ['portfolio', 'greeks'],
    queryFn: async () => {
      const res = await fetch('/api/portfolio/greeks')
      if (!res.ok) throw new Error('Failed to fetch Greeks')
      return res.json()
    },
    refetchInterval: 5000,
  })
}

function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/dashboard')
      if (!res.ok) throw new Error('Failed to fetch analytics')
      return res.json()
    },
    refetchInterval: 30000,
  })
}

function useEquityCurve() {
  return useQuery({
    queryKey: ['equity', 'curve'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/equity-curve')
      if (!res.ok) throw new Error('Failed to fetch equity curve')
      return res.json()
    },
    refetchInterval: 60000,
  })
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AutoTradeDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showKillConfirm, setShowKillConfirm] = useState(false)
  const queryClient = useQueryClient()

  const { data: status, isLoading: statusLoading } = useAutoTradeStatus()
  const autoTradeEnabled = status?.enabled || false
  const tradingMode = status?.mode || 'PAPER'
  const isPaused = status?.isPaused || false

  // Simulated real-time updates
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auto-trade/start', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to start')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['autoTrade'] }),
  })

  const stopMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auto-trade/stop', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to stop')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['autoTrade'] }),
  })

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auto-trade/pause', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to pause')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['autoTrade'] }),
  })

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auto-trade/resume', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to resume')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['autoTrade'] }),
  })

  const killSwitchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auto-trade/kill-switch', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to activate kill switch')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoTrade'] })
      setShowKillConfirm(false)
    },
  })

  const handleKillSwitch = () => {
    setShowKillConfirm(false)
    killSwitchMutation.mutate()
  }

  const isMarketOpen = new Date().getHours() >= 9 && new Date().getHours() < 16 && new Date().getDay() >= 1 && new Date().getDay() <= 5

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'signals', label: 'Live Signals', icon: '⚡' },
    { id: 'positions', label: 'Positions', icon: '📈' },
    { id: 'analytics', label: 'Analytics', icon: '🔬' },
    { id: 'backtest', label: 'Backtest', icon: '⏮️' },
    { id: 'config', label: 'Config', icon: '⚙️' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0a0f1a 0%, #111827 50%, #0d1525 100%)',
      color: '#e2e8f0',
      fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
    }}>
      {/* Ambient grid */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(59, 130, 246, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59, 130, 246, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Kill Switch Confirmation Modal */}
      {showKillConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#1e293b',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '400px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚨</div>
            <h2 style={{ color: '#ef4444', marginBottom: '16px', fontSize: '20px' }}>EMERGENCY KILL SWITCH</h2>
            <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>
              This will immediately close ALL open positions at market price and disable auto-trading.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowKillConfirm(false)}
                style={{
                  padding: '12px 24px',
                  background: '#334155',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleKillSwitch}
                disabled={killSwitchMutation.isPending}
                style={{
                  padding: '12px 24px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontFamily: 'inherit',
                  opacity: killSwitchMutation.isPending ? 0.6 : 1,
                }}
              >
                {killSwitchMutation.isPending ? 'ACTIVATING...' : 'CONFIRM KILL'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', maxWidth: '1800px', margin: '0 auto', padding: '20px' }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '20px',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '6px' }}>
              <h1 style={{
                fontSize: '26px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0,
              }}>
                SPX FUSION
              </h1>
              <StatusBadge active={isMarketOpen} label={isMarketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'} />
              {!statusLoading && (
                <StatusBadge 
                  active={autoTradeEnabled && !isPaused} 
                  label={!autoTradeEnabled ? 'AUTO OFF' : isPaused ? 'PAUSED' : 'AUTO TRADING'} 
                  color={!autoTradeEnabled ? '#64748b' : isPaused ? '#f59e0b' : '#10b981'}
                />
              )}
            </div>
            <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
              Multi-Gate Decision Engine • Paper Trading Mode • Algorithm v2.1
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '22px', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>
                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ET
              </div>
            </div>
          </div>
        </header>

        {/* Control Center */}
        <ControlCenter
          autoTradeEnabled={autoTradeEnabled}
          tradingMode={tradingMode}
          isPaused={isPaused}
          status={status}
          onToggleEnabled={() => {
            if (autoTradeEnabled) {
              stopMutation.mutate()
            } else {
              startMutation.mutate()
            }
          }}
          onModeChange={(mode: string) => {
            // TODO: Implement mode change
          }}
          onPause={() => {
            if (isPaused) {
              resumeMutation.mutate()
            } else {
              pauseMutation.mutate()
            }
          }}
          onKillSwitch={() => setShowKillConfirm(true)}
        />

        {/* Tab Navigation */}
        <nav style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '20px',
          background: 'rgba(15, 23, 42, 0.4)',
          padding: '4px',
          borderRadius: '8px',
          width: 'fit-content',
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                border: activeTab === tab.id ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                borderRadius: '6px',
                color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Main Content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'signals' && <SignalsTab />}
        {activeTab === 'positions' && <PositionsTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'backtest' && <BacktestTab />}
        {activeTab === 'config' && <ConfigTab />}

        {/* Footer */}
        <footer style={{
          marginTop: '24px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(59, 130, 246, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: '#475569',
        }}>
          <span>SPX Fusion v2.1 • 7-Gate Decision Engine • WebSocket Connected</span>
          <span>Paper Trading Mode • No Real Capital at Risk</span>
        </footer>
      </div>
    </div>
  )
}

// ============================================================================
// CONTROL CENTER
// ============================================================================

function ControlCenter({ autoTradeEnabled, tradingMode, isPaused, status, onToggleEnabled, onModeChange, onPause, onKillSwitch }: any) {
  const stats = status || {
    dailyTrades: 0,
    maxDailyTrades: 5,
    todayPnL: 0,
    dailyDrawdown: 0,
    maxDailyDrawdown: 2500,
  }

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.6)',
      border: '1px solid rgba(59, 130, 246, 0.15)',
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      flexWrap: 'wrap',
    }}>
      {/* Auto-Trade Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Auto-Trade</span>
        <ToggleSwitch 
          enabled={autoTradeEnabled} 
          onChange={onToggleEnabled}
        />
      </div>

      {/* Mode Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {['PAPER', 'SHADOW', 'LIVE'].map(mode => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            disabled={mode === 'LIVE'}
            style={{
              padding: '6px 12px',
              background: tradingMode === mode ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
              border: `1px solid ${tradingMode === mode ? '#3b82f6' : 'rgba(100, 116, 139, 0.3)'}`,
              borderRadius: '4px',
              color: tradingMode === mode ? '#3b82f6' : mode === 'LIVE' ? '#475569' : '#94a3b8',
              fontSize: '11px',
              fontWeight: '500',
              cursor: mode === 'LIVE' ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: mode === 'LIVE' ? 0.5 : 1,
            }}
          >
            {mode === 'LIVE' && '🔒 '}{mode}
          </button>
        ))}
      </div>

      {/* Pause/Resume */}
      <button
        onClick={onPause}
        disabled={!autoTradeEnabled}
        style={{
          padding: '6px 14px',
          background: isPaused ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.1)',
          border: `1px solid ${isPaused ? '#f59e0b' : 'rgba(59, 130, 246, 0.3)'}`,
          borderRadius: '4px',
          color: isPaused ? '#f59e0b' : '#94a3b8',
          fontSize: '11px',
          cursor: autoTradeEnabled ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
          opacity: autoTradeEnabled ? 1 : 0.5,
        }}
      >
        {isPaused ? '▶ Resume' : '⏸ Pause'}
      </button>

      {/* Separator */}
      <div style={{ width: '1px', height: '30px', background: 'rgba(59, 130, 246, 0.2)' }} />

      {/* Daily Progress */}
      <div style={{ flex: 1, minWidth: '300px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
          <span style={{ color: '#64748b' }}>
            Trades: <span style={{ color: '#e2e8f0' }}>{stats.dailyTrades || 0}/{stats.maxDailyTrades || 5}</span>
          </span>
          <span style={{ color: '#64748b' }}>
            P&L: <span style={{ color: (stats.todayPnL || 0) >= 0 ? '#10b981' : '#ef4444' }}>
              {(stats.todayPnL || 0) >= 0 ? '+' : ''}${(stats.todayPnL || 0).toLocaleString()}
            </span>
          </span>
          <span style={{ color: '#64748b' }}>
            DD: <span style={{ color: '#e2e8f0' }}>${stats.dailyDrawdown || 0} / -${stats.maxDailyDrawdown || 2500}</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <ProgressBar value={stats.dailyTrades || 0} max={stats.maxDailyTrades || 5} color="#3b82f6" label="trades" />
          <ProgressBar value={Math.abs(stats.dailyDrawdown || 0)} max={stats.maxDailyDrawdown || 2500} color="#ef4444" label="drawdown" inverted />
        </div>
      </div>

      {/* Kill Switch */}
      <button
        onClick={onKillSwitch}
        style={{
          padding: '8px 16px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          color: '#ef4444',
          fontSize: '11px',
          fontWeight: '600',
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        🛑 KILL SWITCH
      </button>
    </div>
  )
}

// ============================================================================
// TAB COMPONENTS
// ============================================================================

function OverviewTab() {
  const { data: analytics } = useAnalytics()
  const { data: equityData } = useEquityCurve()
  const { data: positions } = usePositions()
  const { data: greeks } = usePortfolioGreeks()
  const { data: signals } = useSignalsFeed()

  const stats = analytics?.stats || {
    totalPnL: 0,
    todayPnL: 0,
    winRate: 0,
    avgRMultiple: 0,
    activePositions: 0,
    sharpe: 0,
    signalsToday: 0,
    executedToday: 0,
    blockedToday: 0,
  }

  const portfolioGreeks = greeks || { delta: 0, gamma: 0, theta: 0, vega: 0 }
  const positionsList = positions?.positions || []
  const signalFeed = signals?.signals || []

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' }}>
      {/* Left Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <StatCard label="Total P&L" value={`$${stats.totalPnL.toLocaleString()}`} change="+4.25%" positive icon="📈" />
          <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} subtext="26W / 12L" positive={stats.winRate > 50} icon="🎯" />
          <StatCard label="Avg R-Multiple" value={stats.avgRMultiple.toFixed(2)} subtext="Risk-adjusted" positive={stats.avgRMultiple > 1} icon="⚡" />
          <StatCard label="Sharpe Ratio" value={stats.sharpe.toFixed(2)} subtext="30-day rolling" positive={stats.sharpe > 1.5} icon="📊" />
        </div>

        {/* Equity Curve */}
        <Card title="Equity Curve" subtitle="30-day performance">
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData?.data || []}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59, 130, 246, 0.08)" />
                <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Equity']}
                />
                <Area type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} fill="url(#equityGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Positions Summary */}
        <Card title="Active Positions" subtitle={`${positionsList.length} open trades`}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>
                  {['Strategy', 'Mode', 'Dir', 'Qty', 'P&L', 'Δ', 'θ', 'DTE'].map(h => (
                    <th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: '#64748b', fontWeight: '500' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positionsList.slice(0, 5).map((pos: any) => (
                  <tr key={pos.id} style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.08)' }}>
                    <td style={{ padding: '10px 6px', color: '#e2e8f0' }}>{pos.strategy?.replace(/_/g, ' ') || 'N/A'}</td>
                    <td style={{ padding: '10px 6px' }}>
                      <ModeBadge mode={pos.timeframe_mode || 'SWING'} />
                    </td>
                    <td style={{ padding: '10px 6px' }}>
                      <DirectionIcon direction={pos.direction} />
                    </td>
                    <td style={{ padding: '10px 6px', color: '#e2e8f0' }}>{pos.contracts || pos.quantity || 0}</td>
                    <td style={{ padding: '10px 6px', color: (pos.pnl || 0) >= 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      {(pos.pnl || 0) >= 0 ? '+' : ''}${(pos.pnl || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 6px', color: (pos.total_delta || 0) >= 0 ? '#10b981' : '#ef4444' }}>{pos.total_delta || 0}</td>
                    <td style={{ padding: '10px 6px', color: (pos.total_theta || 0) >= 0 ? '#10b981' : '#ef4444' }}>{pos.total_theta || 0}</td>
                    <td style={{ padding: '10px 6px', color: (pos.entry_dte || 0) <= 7 ? '#ef4444' : (pos.entry_dte || 0) <= 14 ? '#f59e0b' : '#64748b' }}>
                      {pos.entry_dte || 0}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Right Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Portfolio Greeks */}
        <Card title="Portfolio Greeks" subtitle="Aggregate exposure">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <GreekBox label="Delta (Δ)" value={portfolioGreeks.delta} limit={500} color="#3b82f6" />
            <GreekBox label="Gamma (Γ)" value={portfolioGreeks.gamma} limit={100} color="#8b5cf6" />
            <GreekBox label="Theta (θ)" value={portfolioGreeks.theta} limit={200} color="#10b981" positive />
            <GreekBox label="Vega (ν)" value={portfolioGreeks.vega} limit={500} color="#f59e0b" />
          </div>
        </Card>

        {/* Live Signal Feed */}
        <Card title="Live Signal Feed" subtitle="Recent activity" headerAction={<span style={{ fontSize: '10px', color: '#10b981' }}>● Live</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
            {signalFeed.slice(0, 5).map((sig: any) => (
              <SignalFeedItem key={sig.id} signal={sig} compact />
            ))}
          </div>
        </Card>

        {/* Today's Stats */}
        <Card title="Today's Activity" subtitle="Session metrics">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
            <MiniStat label="Signals" value={stats.signalsToday} color="#3b82f6" />
            <MiniStat label="Executed" value={stats.executedToday} color="#10b981" />
            <MiniStat label="Blocked" value={stats.blockedToday} color="#64748b" />
          </div>
        </Card>
      </div>
    </div>
  )
}

function SignalsTab() {
  const { data: signals } = useSignalsFeed()
  const signalFeed = signals?.signals || []

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
      <Card title="Signal Feed" subtitle="All signals with decision details" headerAction={<span style={{ fontSize: '10px', color: '#10b981' }}>● Live</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {signalFeed.map((sig: any) => (
            <SignalFeedItem key={sig.id} signal={sig} />
          ))}
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card title="7-Gate Status" subtitle="Current signal verification">
          <GateStatusDisplay gates={signalFeed[0]?.gateResults || []} />
        </Card>
      </div>
    </div>
  )
}

function PositionsTab() {
  const { data: positions } = usePositions()
  const { data: greeks } = usePortfolioGreeks()
  const positionsList = positions?.positions || []
  const portfolioGreeks = greeks || { delta: 0, gamma: 0, theta: 0, vega: 0 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <StatCard label="Net Delta" value={portfolioGreeks.delta} subtext="Directional exposure" neutral icon="Δ" />
        <StatCard label="Daily Theta" value={`$${portfolioGreeks.theta}`} subtext="Time decay P&L" positive icon="θ" />
        <StatCard label="Gamma Risk" value={portfolioGreeks.gamma} subtext="Delta acceleration" neutral icon="Γ" />
        <StatCard label="Vega Exposure" value={portfolioGreeks.vega} subtext="IV sensitivity" neutral icon="ν" />
      </div>

      <Card title="Open Positions" subtitle="Detailed view with management">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>
              {['Strategy', 'Mode', 'Dir', 'Qty', 'Entry', 'Current', 'P&L', 'Δ', 'θ', 'DTE', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 8px', textAlign: 'left', color: '#64748b', fontWeight: '500' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positionsList.map((pos: any) => (
              <tr key={pos.id} style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.08)' }}>
                <td style={{ padding: '12px 8px', color: '#e2e8f0', fontWeight: '500' }}>{pos.strategy?.replace(/_/g, ' ') || 'N/A'}</td>
                <td style={{ padding: '12px 8px' }}><ModeBadge mode={pos.timeframe_mode || 'SWING'} /></td>
                <td style={{ padding: '12px 8px' }}><DirectionIcon direction={pos.direction} /></td>
                <td style={{ padding: '12px 8px', color: '#e2e8f0' }}>{pos.contracts || pos.quantity || 0}</td>
                <td style={{ padding: '12px 8px', color: '#64748b' }}>{pos.entry_price || 0}</td>
                <td style={{ padding: '12px 8px', color: '#e2e8f0' }}>{pos.current_price || pos.entry_price || 0}</td>
                <td style={{ padding: '12px 8px', color: (pos.pnl || 0) >= 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                  {(pos.pnl || 0) >= 0 ? '+' : ''}${(pos.pnl || 0).toFixed(2)}
                </td>
                <td style={{ padding: '12px 8px', color: (pos.total_delta || 0) >= 0 ? '#10b981' : '#ef4444' }}>{pos.total_delta || 0}</td>
                <td style={{ padding: '12px 8px', color: (pos.total_theta || 0) >= 0 ? '#10b981' : '#ef4444' }}>{pos.total_theta || 0}</td>
                <td style={{ padding: '12px 8px', color: (pos.entry_dte || 0) <= 7 ? '#ef4444' : (pos.entry_dte || 0) <= 14 ? '#f59e0b' : '#64748b', fontWeight: (pos.entry_dte || 0) <= 7 ? '600' : '400' }}>
                  {pos.entry_dte || 0}d
                </td>
                <td style={{ padding: '12px 8px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <ActionButton label="½" title="Close half" />
                    <ActionButton label="✕" title="Close all" danger />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function AnalyticsTab() {
  const { data: analytics } = useAnalytics()
  const gateAnalytics = analytics?.gateAnalytics || []
  const signalAnalytics = analytics?.signalAnalytics || []

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <Card title="Gate Performance" subtitle="Efficiency analysis by gate">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>
              {['Gate', 'Name', 'Pass %', 'Blocked', 'Missed', 'Efficiency'].map(h => (
                <th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: '#64748b', fontWeight: '500' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gateAnalytics.map((gate: any) => (
              <tr key={gate.gate} style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.08)' }}>
                <td style={{ padding: '10px 6px' }}>
                  <span style={{
                    width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: '#3b82f6', borderRadius: '4px', fontSize: '10px', fontWeight: '700', color: '#fff'
                  }}>{gate.gate}</span>
                </td>
                <td style={{ padding: '10px 6px', color: '#e2e8f0' }}>{gate.name}</td>
                <td style={{ padding: '10px 6px', color: gate.passRate > 80 ? '#10b981' : gate.passRate > 60 ? '#f59e0b' : '#ef4444' }}>
                  {gate.passRate}%
                </td>
                <td style={{ padding: '10px 6px', color: '#64748b' }}>{gate.blocked}</td>
                <td style={{ padding: '10px 6px', color: gate.missedWins > 10 ? '#f59e0b' : '#64748b' }}>
                  {gate.missedWins} {gate.warning && '⚠️'}
                </td>
                <td style={{ padding: '10px 6px', color: gate.efficiency > 95 ? '#10b981' : gate.efficiency > 90 ? '#f59e0b' : '#ef4444' }}>
                  {gate.efficiency}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Signal Analytics" subtitle="Performance by signal type">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.15)' }}>
              {['Signal', 'Generated', 'Executed', 'Win %', 'Avg R', 'Best Time'].map(h => (
                <th key={h} style={{ padding: '8px 6px', textAlign: 'left', color: '#64748b', fontWeight: '500' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {signalAnalytics.map((sig: any) => (
              <tr key={sig.type} style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.08)' }}>
                <td style={{ padding: '10px 6px', color: '#e2e8f0', fontWeight: '500' }}>{sig.type}</td>
                <td style={{ padding: '10px 6px', color: '#64748b' }}>{sig.generated}</td>
                <td style={{ padding: '10px 6px', color: '#64748b' }}>{sig.executed}</td>
                <td style={{ padding: '10px 6px', color: sig.winRate > 65 ? '#10b981' : sig.winRate > 55 ? '#f59e0b' : '#ef4444' }}>
                  {sig.winRate}%
                </td>
                <td style={{ padding: '10px 6px', color: sig.avgR > 1.5 ? '#10b981' : '#f59e0b' }}>{sig.avgR}R</td>
                <td style={{ padding: '10px 6px', color: '#64748b', fontSize: '10px' }}>{sig.bestTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function BacktestTab() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px' }}>
      <Card title="New Backtest" subtitle="Configure and run simulation">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <InputField label="Start Date" type="date" defaultValue="2024-01-01" />
          <InputField label="End Date" type="date" defaultValue="2024-12-01" />
          <InputField label="Initial Capital" type="text" defaultValue="$100,000" />
          <button
            style={{
              marginTop: '8px', padding: '12px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none',
              borderRadius: '6px', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            ▶ Run Backtest
          </button>
        </div>
      </Card>
      <Card title="Backtest Results" subtitle="Historical simulation outcomes">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>📊</div>
          <div style={{ fontSize: '13px' }}>Run a backtest to see results</div>
        </div>
      </Card>
    </div>
  )
}

function ConfigTab() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <Card title="Signal Weights" subtitle="Adjust scoring for each signal type">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {['FVG', 'DISPLACEMENT', 'BREAKER', 'STRAT_212', 'BOS', 'MSS', 'SWEEP_LOW', 'VOLUME_SURGE'].map(signal => (
            <div key={signal} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ width: '100px', fontSize: '11px', color: '#e2e8f0' }}>{signal}</span>
              <input type="range" min="0" max="5" step="0.5" defaultValue="2.5" style={{ flex: 1 }} />
              <span style={{ width: '30px', fontSize: '11px', color: '#64748b' }}>2.5</span>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Gate Thresholds" subtitle="Adjust decision engine parameters">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <InputField label="Min Confidence (Gate 1)" type="number" defaultValue="5.5" step="0.1" />
          <InputField label="Min Confluence (Gate 1)" type="number" defaultValue="2" step="1" />
          <InputField label="Min Score (Gate 3)" type="number" defaultValue="6.0" step="0.5" />
        </div>
      </Card>
    </div>
  )
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function Card({ title, subtitle, headerAction, children }: any) {
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(59, 130, 246, 0.12)',
      borderRadius: '10px',
      padding: '16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', margin: 0 }}>{title}</h3>
          {subtitle && <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0' }}>{subtitle}</p>}
        </div>
        {headerAction}
      </div>
      {children}
    </div>
  )
}

function StatCard({ label, value, change, subtext, positive, neutral, icon }: any) {
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.6)',
      border: '1px solid rgba(59, 130, 246, 0.12)',
      borderRadius: '10px',
      padding: '14px',
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: '10px', right: '12px', fontSize: '20px', opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>{label}</div>
      <div style={{
        fontSize: '24px',
        fontWeight: '700',
        color: neutral ? '#e2e8f0' : positive ? '#10b981' : '#ef4444',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      {(change || subtext) && (
        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
          {change && <span style={{ color: positive ? '#10b981' : '#ef4444' }}>{change} </span>}
          {subtext}
        </div>
      )}
    </div>
  )
}

function GreekBox({ label, value, limit, color, positive }: any) {
  const pct = Math.min(100, (Math.abs(value) / limit) * 100)
  const isWarning = pct > 70
  return (
    <div style={{
      padding: '12px',
      background: 'rgba(15, 23, 42, 0.5)',
      borderRadius: '6px',
      border: `1px solid ${isWarning ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.1)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
        <span style={{ fontSize: '10px', color: '#64748b' }}>{label}</span>
        <span style={{ fontSize: '16px', fontWeight: '600', color: positive ? '#10b981' : color }}>
          {value >= 0 && positive ? '+' : ''}{value}
        </span>
      </div>
      <div style={{ height: '3px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: isWarning ? '#f59e0b' : color, borderRadius: '2px' }} />
      </div>
      <div style={{ fontSize: '9px', color: '#475569', marginTop: '3px', textAlign: 'right' }}>{Math.round(pct)}% of {limit}</div>
    </div>
  )
}

function StatusBadge({ active, label, color }: any) {
  const badgeColor = color || (active ? '#10b981' : '#ef4444')
  return (
    <span style={{
      padding: '3px 10px',
      background: `${badgeColor}15`,
      border: `1px solid ${badgeColor}`,
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: '600',
      color: badgeColor,
      letterSpacing: '0.3px',
    }}>
      {active ? '●' : '○'} {label}
    </span>
  )
}

function ModeBadge({ mode }: any) {
  const colors: any = {
    INTRADAY: { bg: 'rgba(6, 182, 212, 0.15)', border: '#06b6d4', text: '#06b6d4' },
    SWING: { bg: 'rgba(139, 92, 246, 0.15)', border: '#8b5cf6', text: '#8b5cf6' },
    MONTHLY: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#f59e0b' },
    LEAPS: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#10b981' },
  }
  const c = colors[mode] || colors.SWING
  return (
    <span style={{
      padding: '2px 6px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: '3px',
      fontSize: '9px',
      fontWeight: '600',
      color: c.text,
    }}>{mode}</span>
  )
}

function DirectionIcon({ direction }: any) {
  return (
    <span style={{
      color: direction === 'LONG' ? '#10b981' : direction === 'SHORT' ? '#ef4444' : '#64748b',
      fontWeight: '600',
    }}>
      {direction === 'LONG' ? '▲' : direction === 'SHORT' ? '▼' : '◆'}
    </span>
  )
}

function ToggleSwitch({ enabled, onChange }: any) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        border: 'none',
        background: enabled ? '#10b981' : '#334155',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: 'white',
        position: 'absolute',
        top: '3px',
        left: enabled ? '23px' : '3px',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

function ProgressBar({ value, max, color, label, inverted }: any) {
  const pct = (value / max) * 100
  return (
    <div style={{ flex: 1 }}>
      <div style={{ height: '6px', background: 'rgba(51, 65, 85, 0.5)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: inverted ? (pct > 50 ? '#ef4444' : pct > 30 ? '#f59e0b' : color) : color,
          borderRadius: '3px',
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )
}

function SignalFeedItem({ signal, compact }: any) {
  const status = signal.decision === 'TRADE' ? 'EXECUTED' : 'BLOCKED'
  const score = signal.score || signal.score_breakdown?.total || 0
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: compact ? '8px 10px' : '10px 12px',
      background: 'rgba(15, 23, 42, 0.5)',
      borderRadius: '6px',
      borderLeft: `3px solid ${status === 'EXECUTED' ? '#10b981' : '#64748b'}`,
    }}>
      <span style={{ fontSize: '10px', color: '#64748b', fontVariantNumeric: 'tabular-nums', minWidth: '55px' }}>
        {signal.created_at ? new Date(signal.created_at).toLocaleTimeString('en-US', { hour12: false }) : '--:--:--'}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <DirectionIcon direction={signal.direction} />
          <span style={{ fontSize: '11px', color: '#e2e8f0' }}>
            {Array.isArray(signal.active_signals) ? signal.active_signals.join(' + ') : signal.signal_type || 'N/A'}
          </span>
          {signal.timeframe_mode && <ModeBadge mode={signal.timeframe_mode} />}
        </div>
        {!compact && status === 'BLOCKED' && signal.block_reason && (
          <div style={{ fontSize: '9px', color: '#f59e0b', marginTop: '3px' }}>{signal.block_reason}</div>
        )}
      </div>
      <span style={{
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: '600',
        background: score >= 7 ? 'rgba(16, 185, 129, 0.15)' : score >= 6 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
        color: score >= 7 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444',
      }}>{score.toFixed(1)}</span>
      {status === 'EXECUTED' ? (
        <span style={{ fontSize: '10px', color: '#3b82f6', minWidth: '50px', textAlign: 'right' }}>Running...</span>
      ) : (
        <span style={{ fontSize: '10px', color: '#64748b', minWidth: '50px', textAlign: 'right' }}>BLOCKED</span>
      )}
    </div>
  )
}

function GateStatusDisplay({ gates }: any) {
  const gateNames = ['Signal', 'Session', 'Score', 'Roles', 'R:R', 'Size', 'Limits']
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {gateNames.map((name, i) => {
        const gateResult = Array.isArray(gates) ? gates[i] : null
        return (
          <div key={i} style={{
            padding: '8px 10px',
            background: gateResult === true ? 'rgba(16, 185, 129, 0.1)' : gateResult === false ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)',
            border: `1px solid ${gateResult === true ? 'rgba(16, 185, 129, 0.3)' : gateResult === false ? 'rgba(239, 68, 68, 0.3)' : 'rgba(100, 116, 139, 0.2)'}`,
            borderRadius: '6px',
            textAlign: 'center',
            flex: '1 1 calc(25% - 6px)',
            minWidth: '70px',
          }}>
            <div style={{ fontSize: '14px', marginBottom: '2px' }}>
              {gateResult === true ? '✓' : gateResult === false ? '✗' : '○'}
            </div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>{name}</div>
          </div>
        )
      })}
    </div>
  )
}

function MiniStat({ label, value, color }: any) {
  return (
    <div>
      <div style={{ fontSize: '20px', fontWeight: '600', color }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

function InputField({ label, type, defaultValue, step }: any) {
  return (
    <div>
      <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        step={step}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '6px',
          color: '#e2e8f0',
          fontSize: '12px',
          fontFamily: 'inherit',
        }}
      />
    </div>
  )
}

function ActionButton({ label, title, danger }: any) {
  return (
    <button
      title={title}
      style={{
        width: '24px',
        height: '24px',
        borderRadius: '4px',
        border: `1px solid ${danger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
        background: danger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
        color: danger ? '#ef4444' : '#3b82f6',
        fontSize: '10px',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  )
}


