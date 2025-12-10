export interface TradingViewSignal {
  symbol: string;
  resolution: string;
  timestamp: number;
  signal_type: string;
  direction: 'LONG' | 'SHORT';
  confidence: number;
  signal_strength: number;
  confluence_count: number;
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  active_signals: string[];
}

export interface GateResult {
  gate: string;
  passed: boolean;
  reason?: string;
  score?: number;
  volatilityCheck?: {
    vix: number | null;
    acceptable: boolean;
  };
}

export interface DecisionAudit {
  id?: number;
  signal_id: number;
  decision: 'TRADE' | 'BLOCK';
  trade_mode?: 'TREND' | 'REVERSAL' | 'BREAKOUT';
  block_reason?: string;
  gate_results: GateResult[];
  signals: {
    primary: string;
    confirmations: string[];
    blockers?: string[];
  };
  score_breakdown: {
    total: number;
    by_family: Record<string, number>;
  };
  regime: {
    session: string;
    volatility?: number;
  };
  risk_calculation: {
    base_risk: number;
    adjusted_risk: number;
    quantity: number;
    risk_reward: number;
  };
}

export interface PaperTrade {
  id?: number;
  decision_id: number;
  signal_id: number;
  symbol: string;
  contract_symbol?: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  quantity: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2?: number;
  take_profit_3?: number;
  status: 'OPEN' | 'CLOSED';
  exit_price?: number;
  exit_reason?: string;
  pnl?: number;
  r_multiple?: number;
  duration_minutes?: number;
  entered_at?: Date;
  exited_at?: Date;
}

export interface DailyLimit {
  id?: number;
  trade_date: Date;
  trades_count: number;
  daily_pnl: number;
  max_drawdown: number;
  breached: boolean;
}

// Options trading extensions
export interface OptionsPosition {
  id?: number;
  decision_id: number;
  signal_id: number;
  symbol: string;
  strategy: string;
  timeframe_mode: 'INTRADAY' | 'SWING' | 'MONTHLY' | 'LEAPS';
  direction: 'LONG' | 'SHORT';
  status: 'OPEN' | 'CLOSED';
  contracts: number;
  entry_price: number;
  current_price?: number;
  strike: number;
  expiration: Date;
  option_type: 'CALL' | 'PUT';
  entry_iv?: number;
  current_iv?: number;
  iv_rank?: number;
  entry_dte: number;
  current_dte?: number;
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  total_delta?: number;
  total_gamma?: number;
  total_theta?: number;
  total_vega?: number;
  max_loss?: number;
  max_gain?: number;
  exit_rules?: Array<{
    type: string;
    trigger: number;
    action: string;
  }>;
  pnl?: number;
  pnl_percent?: number;
  exit_price?: number;
  exit_reason?: string;
  exited_at?: Date;
  entered_at?: Date;
}

