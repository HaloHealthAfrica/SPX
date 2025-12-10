const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create signals_log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS signals_log (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(10) NOT NULL,
        resolution VARCHAR(10) NOT NULL,
        timestamp BIGINT NOT NULL,
        signal_type VARCHAR(50) NOT NULL,
        direction VARCHAR(10) NOT NULL,
        confidence DECIMAL(5,2) NOT NULL,
        signal_strength DECIMAL(5,2) NOT NULL,
        confluence_count INTEGER NOT NULL,
        entry_price DECIMAL(10,2) NOT NULL,
        stop_loss DECIMAL(10,2) NOT NULL,
        take_profit_1 DECIMAL(10,2) NOT NULL,
        active_signals JSONB NOT NULL DEFAULT '[]',
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed BOOLEAN DEFAULT FALSE
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_signals_processed_received 
      ON signals_log(processed, received_at)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_signals_timestamp 
      ON signals_log(timestamp DESC)
    `);

    // Create decision_audit table
    await client.query(`
      CREATE TABLE IF NOT EXISTS decision_audit (
        id SERIAL PRIMARY KEY,
        signal_id INTEGER REFERENCES signals_log(id),
        decision VARCHAR(10) NOT NULL,
        trade_mode VARCHAR(20),
        block_reason TEXT,
        gate_results JSONB NOT NULL DEFAULT '[]',
        signals JSONB NOT NULL DEFAULT '{}',
        score_breakdown JSONB NOT NULL DEFAULT '{}',
        regime JSONB NOT NULL DEFAULT '{}',
        risk_calculation JSONB NOT NULL DEFAULT '{}',
        decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_decision_audit_decision_decided 
      ON decision_audit(decision, decided_at DESC)
    `);

    // Create paper_trades table
    await client.query(`
      CREATE TABLE IF NOT EXISTS paper_trades (
        id SERIAL PRIMARY KEY,
        decision_id INTEGER REFERENCES decision_audit(id),
        signal_id INTEGER REFERENCES signals_log(id),
        symbol VARCHAR(10) NOT NULL,
        contract_symbol VARCHAR(50),
        direction VARCHAR(10) NOT NULL,
        entry_price DECIMAL(10,2) NOT NULL,
        quantity INTEGER NOT NULL,
        stop_loss DECIMAL(10,2) NOT NULL,
        take_profit_1 DECIMAL(10,2) NOT NULL,
        take_profit_2 DECIMAL(10,2),
        take_profit_3 DECIMAL(10,2),
        status VARCHAR(10) NOT NULL DEFAULT 'OPEN',
        exit_price DECIMAL(10,2),
        exit_reason VARCHAR(50),
        pnl DECIMAL(10,2),
        r_multiple DECIMAL(5,2),
        duration_minutes INTEGER,
        entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        exited_at TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_paper_trades_status_entered 
      ON paper_trades(status, entered_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_paper_trades_symbol_entered 
      ON paper_trades(symbol, entered_at DESC)
    `);

    // Create daily_limits table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_limits (
        id SERIAL PRIMARY KEY,
        trade_date DATE UNIQUE NOT NULL,
        trades_count INTEGER DEFAULT 0,
        daily_pnl DECIMAL(10,2) DEFAULT 0,
        max_drawdown DECIMAL(10,2) DEFAULT 0,
        breached BOOLEAN DEFAULT FALSE
      )
    `);

    // Create system_state table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_state (
        id SERIAL PRIMARY KEY,
        state_key VARCHAR(100) UNIQUE NOT NULL,
        state_value JSONB NOT NULL DEFAULT '{}',
        expires_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create options_positions table (Agent 10)
    await client.query(`
      CREATE TABLE IF NOT EXISTS options_positions (
        id SERIAL PRIMARY KEY,
        decision_id INTEGER REFERENCES decision_audit(id),
        signal_id INTEGER REFERENCES signals_log(id),
        symbol VARCHAR(10) NOT NULL,
        strategy VARCHAR(50) NOT NULL,
        timeframe_mode VARCHAR(20) NOT NULL,
        direction VARCHAR(10) NOT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'OPEN',
        contracts INTEGER NOT NULL,
        entry_price DECIMAL(10,4) NOT NULL,
        current_price DECIMAL(10,4),
        strike DECIMAL(10,2) NOT NULL,
        expiration DATE NOT NULL,
        option_type VARCHAR(10) NOT NULL,
        entry_iv DECIMAL(5,2),
        current_iv DECIMAL(5,2),
        iv_rank INTEGER,
        entry_dte INTEGER NOT NULL,
        current_dte INTEGER,
        greeks JSONB NOT NULL DEFAULT '{}',
        total_delta DECIMAL(10,2),
        total_gamma DECIMAL(10,2),
        total_theta DECIMAL(10,2),
        total_vega DECIMAL(10,2),
        max_loss DECIMAL(10,2),
        max_gain DECIMAL(10,2),
        exit_rules JSONB NOT NULL DEFAULT '[]',
        pnl DECIMAL(10,2),
        pnl_percent DECIMAL(5,2),
        exit_price DECIMAL(10,4),
        exit_reason VARCHAR(50),
        exited_at TIMESTAMP,
        entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_options_positions_status_entered 
      ON options_positions(status, entered_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_options_positions_symbol_expiration 
      ON options_positions(symbol, expiration)
    `);

    // Create market_events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS market_events (
        id SERIAL PRIMARY KEY,
        event_date DATE NOT NULL,
        event_type VARCHAR(20) NOT NULL,
        symbol VARCHAR(10),
        expected_move DECIMAL(5,2),
        iv_impact VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_market_events_date_type 
      ON market_events(event_date, event_type)
    `);

    // Create portfolio_greeks table for tracking aggregate exposure
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_greeks (
        id SERIAL PRIMARY KEY,
        snapshot_date DATE NOT NULL,
        snapshot_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_delta DECIMAL(10,2) DEFAULT 0,
        total_gamma DECIMAL(10,2) DEFAULT 0,
        total_theta DECIMAL(10,2) DEFAULT 0,
        total_vega DECIMAL(10,2) DEFAULT 0,
        beta_weighted_delta DECIMAL(10,2) DEFAULT 0
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_greeks_date 
      ON portfolio_greeks(snapshot_date DESC, snapshot_time DESC)
    `);

    // Auto-trading tables (Agent 1)
    // Algorithm configurations
    await client.query(`
      CREATE TABLE IF NOT EXISTS algorithm_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        version VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        config JSONB NOT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Generated signals (auto-generated)
    await client.query(`
      CREATE TABLE IF NOT EXISTS auto_signals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        symbol VARCHAR(20) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        timeframe VARCHAR(10) NOT NULL,
        signal_type VARCHAR(50) NOT NULL,
        direction VARCHAR(10) NOT NULL,
        confidence DECIMAL(5,2) NOT NULL,
        confluence_count INT NOT NULL,
        active_signals JSONB NOT NULL,
        entry_price DECIMAL(12,4) NOT NULL,
        stop_loss DECIMAL(12,4) NOT NULL,
        take_profit_1 DECIMAL(12,4) NOT NULL,
        take_profit_2 DECIMAL(12,4),
        take_profit_3 DECIMAL(12,4),
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auto_signals_symbol_timestamp 
      ON auto_signals(symbol, timestamp DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auto_signals_type 
      ON auto_signals(signal_type)
    `);

    // Auto-trade decisions
    await client.query(`
      CREATE TABLE IF NOT EXISTS auto_decisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        signal_id UUID REFERENCES auto_signals(id),
        algorithm_version VARCHAR(50) NOT NULL,
        decision VARCHAR(10) NOT NULL,
        block_reason TEXT,
        gate_results JSONB NOT NULL,
        strategy VARCHAR(50),
        trade_mode VARCHAR(20),
        position_size INT,
        risk_amount DECIMAL(12,2),
        expected_rr DECIMAL(5,2),
        total_score DECIMAL(5,2),
        score_breakdown JSONB,
        processing_time_ms INT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auto_decisions_signal 
      ON auto_decisions(signal_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auto_decisions_version 
      ON auto_decisions(algorithm_version)
    `);

    // Position snapshots for Greeks tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS position_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trade_id INTEGER REFERENCES paper_trades(id),
        timestamp TIMESTAMPTZ NOT NULL,
        underlying_price DECIMAL(12,4) NOT NULL,
        position_value DECIMAL(12,2) NOT NULL,
        unrealized_pnl DECIMAL(12,2) NOT NULL,
        delta DECIMAL(8,4),
        gamma DECIMAL(8,4),
        theta DECIMAL(8,4),
        vega DECIMAL(8,4),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_snapshots_trade 
      ON position_snapshots(trade_id, timestamp DESC)
    `);

    // Daily performance log
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_performance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date DATE NOT NULL UNIQUE,
        algorithm_version VARCHAR(50) NOT NULL,
        starting_equity DECIMAL(14,2) NOT NULL,
        ending_equity DECIMAL(14,2) NOT NULL,
        high_water_mark DECIMAL(14,2) NOT NULL,
        realized_pnl DECIMAL(12,2) NOT NULL,
        unrealized_pnl DECIMAL(12,2) NOT NULL,
        total_pnl DECIMAL(12,2) NOT NULL,
        signals_generated INT DEFAULT 0,
        trades_executed INT DEFAULT 0,
        trades_blocked INT DEFAULT 0,
        winning_trades INT DEFAULT 0,
        losing_trades INT DEFAULT 0,
        drawdown_amount DECIMAL(12,2) DEFAULT 0,
        drawdown_percent DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_perf_date 
      ON daily_performance(date DESC)
    `);

    // Backtest runs
    await client.query(`
      CREATE TABLE IF NOT EXISTS backtest_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        config JSONB NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        results JSONB,
        error_message TEXT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_backtest_status 
      ON backtest_runs(status)
    `);

    // Alerts/notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB,
        acknowledged BOOLEAN DEFAULT FALSE,
        acknowledged_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alerts_type 
      ON alerts(type)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alerts_severity 
      ON alerts(severity)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged 
      ON alerts(acknowledged)
    `);

    // Auto-trade state
    await client.query(`
      CREATE TABLE IF NOT EXISTS auto_trade_state (
        id SERIAL PRIMARY KEY,
        enabled BOOLEAN DEFAULT FALSE,
        mode VARCHAR(20) DEFAULT 'PAPER',
        is_running BOOLEAN DEFAULT FALSE,
        is_paused BOOLEAN DEFAULT FALSE,
        session_start TIMESTAMPTZ,
        algorithm_version VARCHAR(50),
        config JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

