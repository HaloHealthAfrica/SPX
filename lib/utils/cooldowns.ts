import pool from '@/lib/db';

/**
 * Cooldown management using system_state table
 */

interface CooldownConfig {
  symbolCooldownMinutes: number; // Cooldown for same symbol
  signalTypeCooldownMinutes: number; // Cooldown for same signal type
  globalCooldownMinutes: number; // Global cooldown after N trades
  globalCooldownTradeCount: number; // Number of trades before global cooldown
}

const DEFAULT_CONFIG: CooldownConfig = {
  symbolCooldownMinutes: 15, // 15 minutes between trades on same symbol
  signalTypeCooldownMinutes: 10, // 10 minutes between same signal type
  globalCooldownMinutes: 30, // 30 minutes after 3 trades
  globalCooldownTradeCount: 3,
};

/**
 * Check if symbol is in cooldown
 */
export async function checkSymbolCooldown(
  symbol: string,
  config: CooldownConfig = DEFAULT_CONFIG
): Promise<{ inCooldown: boolean; expiresAt?: Date; reason?: string }> {
  const stateKey = `cooldown:symbol:${symbol}`;
  
  try {
    const result = await pool.query(
      'SELECT state_value, expires_at FROM system_state WHERE state_key = $1',
      [stateKey]
    );

    if (result.rows.length > 0) {
      const state = result.rows[0];
      const expiresAt = new Date(state.expires_at);
      
      if (expiresAt > new Date()) {
        return {
          inCooldown: true,
          expiresAt,
          reason: `Symbol ${symbol} is in cooldown until ${expiresAt.toISOString()}`,
        };
      } else {
        // Expired, remove it
        await pool.query('DELETE FROM system_state WHERE state_key = $1', [stateKey]);
      }
    }

    return { inCooldown: false };
  } catch (error) {
    console.error('Cooldown check error:', error);
    // Fail open - allow trade if cooldown check fails
    return { inCooldown: false };
  }
}

/**
 * Check if signal type is in cooldown
 */
export async function checkSignalTypeCooldown(
  signalType: string,
  config: CooldownConfig = DEFAULT_CONFIG
): Promise<{ inCooldown: boolean; expiresAt?: Date; reason?: string }> {
  const stateKey = `cooldown:signal_type:${signalType}`;
  
  try {
    const result = await pool.query(
      'SELECT state_value, expires_at FROM system_state WHERE state_key = $1',
      [stateKey]
    );

    if (result.rows.length > 0) {
      const state = result.rows[0];
      const expiresAt = new Date(state.expires_at);
      
      if (expiresAt > new Date()) {
        return {
          inCooldown: true,
          expiresAt,
          reason: `Signal type ${signalType} is in cooldown until ${expiresAt.toISOString()}`,
        };
      } else {
        await pool.query('DELETE FROM system_state WHERE state_key = $1', [stateKey]);
      }
    }

    return { inCooldown: false };
  } catch (error) {
    console.error('Cooldown check error:', error);
    return { inCooldown: false };
  }
}

/**
 * Check global cooldown (after N trades)
 */
export async function checkGlobalCooldown(
  config: CooldownConfig = DEFAULT_CONFIG
): Promise<{ inCooldown: boolean; expiresAt?: Date; reason?: string }> {
  const stateKey = 'cooldown:global';
  
  try {
    // Get recent trade count (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const tradeCountResult = await pool.query(
      `SELECT COUNT(*) as count FROM paper_trades 
       WHERE entered_at > $1 AND status = 'OPEN'`,
      [oneHourAgo]
    );
    
    const recentTradeCount = parseInt(tradeCountResult.rows[0]?.count || '0');

    // Check if we need to start global cooldown
    if (recentTradeCount >= config.globalCooldownTradeCount) {
      const result = await pool.query(
        'SELECT state_value, expires_at FROM system_state WHERE state_key = $1',
        [stateKey]
      );

      if (result.rows.length > 0) {
        const state = result.rows[0];
        const expiresAt = new Date(state.expires_at);
        
        if (expiresAt > new Date()) {
          return {
            inCooldown: true,
            expiresAt,
            reason: `Global cooldown active until ${expiresAt.toISOString()} (${recentTradeCount} recent trades)`,
          };
        }
      } else {
        // Start global cooldown
        const expiresAt = new Date(Date.now() + config.globalCooldownMinutes * 60 * 1000);
        await pool.query(
          `INSERT INTO system_state (state_key, state_value, expires_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (state_key) DO UPDATE SET
             state_value = EXCLUDED.state_value,
             expires_at = EXCLUDED.expires_at,
             updated_at = CURRENT_TIMESTAMP`,
          [stateKey, JSON.stringify({ tradeCount: recentTradeCount }), expiresAt]
        );
        
        return {
          inCooldown: true,
          expiresAt,
          reason: `Global cooldown started (${recentTradeCount} recent trades)`,
        };
      }
    }

    return { inCooldown: false };
  } catch (error) {
    console.error('Global cooldown check error:', error);
    return { inCooldown: false };
  }
}

/**
 * Set cooldown for symbol
 */
export async function setSymbolCooldown(
  symbol: string,
  minutes: number = DEFAULT_CONFIG.symbolCooldownMinutes
): Promise<void> {
  const stateKey = `cooldown:symbol:${symbol}`;
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  
  await pool.query(
    `INSERT INTO system_state (state_key, state_value, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (state_key) DO UPDATE SET
       state_value = EXCLUDED.state_value,
       expires_at = EXCLUDED.expires_at,
       updated_at = CURRENT_TIMESTAMP`,
    [stateKey, JSON.stringify({ symbol, setAt: new Date().toISOString() }), expiresAt]
  );
}

/**
 * Set cooldown for signal type
 */
export async function setSignalTypeCooldown(
  signalType: string,
  minutes: number = DEFAULT_CONFIG.signalTypeCooldownMinutes
): Promise<void> {
  const stateKey = `cooldown:signal_type:${signalType}`;
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  
  await pool.query(
    `INSERT INTO system_state (state_key, state_value, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (state_key) DO UPDATE SET
       state_value = EXCLUDED.state_value,
       expires_at = EXCLUDED.expires_at,
       updated_at = CURRENT_TIMESTAMP`,
    [stateKey, JSON.stringify({ signalType, setAt: new Date().toISOString() }), expiresAt]
  );
}

/**
 * Check all cooldowns
 */
export async function checkAllCooldowns(
  symbol: string,
  signalType: string,
  config: CooldownConfig = DEFAULT_CONFIG
): Promise<{ allowed: boolean; reason?: string; cooldowns: any[] }> {
  const cooldowns: any[] = [];
  
  // Check symbol cooldown
  const symbolCheck = await checkSymbolCooldown(symbol, config);
  if (symbolCheck.inCooldown) {
    cooldowns.push({ type: 'symbol', ...symbolCheck });
    return {
      allowed: false,
      reason: symbolCheck.reason,
      cooldowns,
    };
  }

  // Check signal type cooldown
  const signalTypeCheck = await checkSignalTypeCooldown(signalType, config);
  if (signalTypeCheck.inCooldown) {
    cooldowns.push({ type: 'signal_type', ...signalTypeCheck });
    return {
      allowed: false,
      reason: signalTypeCheck.reason,
      cooldowns,
    };
  }

  // Check global cooldown
  const globalCheck = await checkGlobalCooldown(config);
  if (globalCheck.inCooldown) {
    cooldowns.push({ type: 'global', ...globalCheck });
    return {
      allowed: false,
      reason: globalCheck.reason,
      cooldowns,
    };
  }

  return { allowed: true, cooldowns: [] };
}


