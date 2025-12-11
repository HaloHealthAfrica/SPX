import { NextResponse } from 'next/server';
import { Pool } from 'pg';

/**
 * Database migration endpoint
 * Runs migrations directly in the API route
 * 
 * Usage: Visit https://spx-iota.vercel.app/api/db/migrate
 */
export async function GET() {
  // Support both DATABASE_URL and POSTGRES_URL (Vercel Postgres uses POSTGRES_URL)
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  
  if (!connectionString) {
    return NextResponse.json(
      {
        success: false,
        error: 'DATABASE_URL or POSTGRES_URL not configured',
      },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const migrations: string[] = [];

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
    migrations.push('signals_log');

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
    migrations.push('decision_audit');

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
        direction VARCHAR(10) NOT NULL,
        entry_price DECIMAL(12,4) NOT NULL,
        quantity INTEGER NOT NULL,
        stop_loss DECIMAL(12,4) NOT NULL,
        take_profit_1 DECIMAL(12,4) NOT NULL,
        take_profit_2 DECIMAL(12,4),
        take_profit_3 DECIMAL(12,4),
        status VARCHAR(10) NOT NULL,
        exit_price DECIMAL(12,4),
        exit_reason VARCHAR(50),
        pnl DECIMAL(12,2),
        r_multiple DECIMAL(5,2),
        duration_minutes INTEGER,
        entered_at TIMESTAMP NOT NULL,
        exited_at TIMESTAMP
      )
    `);
    migrations.push('paper_trades');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_paper_trades_status 
      ON paper_trades(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_paper_trades_symbol 
      ON paper_trades(symbol)
    `);

    // Create daily_limits table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_limits (
        trade_date DATE PRIMARY KEY,
        trades_count INTEGER NOT NULL DEFAULT 0,
        daily_pnl DECIMAL(12,2) NOT NULL DEFAULT 0,
        max_drawdown DECIMAL(12,2) NOT NULL DEFAULT 0,
        breached BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);
    migrations.push('daily_limits');

    // Create system_state table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_state (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    migrations.push('system_state');

    // Create algorithm_configs table
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
    migrations.push('algorithm_configs');

    // Create auto_signals table
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
    migrations.push('auto_signals');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auto_signals_symbol_timestamp 
      ON auto_signals(symbol, timestamp DESC)
    `);

    // Create auto_decisions table
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
    migrations.push('auto_decisions');

    // Create auto_trade_state table
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
    migrations.push('auto_trade_state');

    // Create daily_performance table
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_performance (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        total_pnl DECIMAL(12,2) NOT NULL DEFAULT 0,
        trades_count INTEGER NOT NULL DEFAULT 0,
        win_rate DECIMAL(5,2),
        avg_r_multiple DECIMAL(5,2),
        max_drawdown DECIMAL(12,2),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    migrations.push('daily_performance');

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Database migrations completed successfully',
      tables_created: migrations.length,
      tables: migrations,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[Migration] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.code,
      },
      { status: 500 }
    );
  } finally {
    client.release();
    await pool.end();
  }
}
