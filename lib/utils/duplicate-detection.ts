import pool from '@/lib/db';

/**
 * Check if a signal is a duplicate based on:
 * - Same symbol
 * - Same timestamp (within 60 seconds)
 * - Same signal type
 * - Same direction
 */
export async function isDuplicateSignal(
  symbol: string,
  timestamp: number,
  signalType: string,
  direction: string,
  toleranceSeconds: number = 60
): Promise<{ isDuplicate: boolean; existingSignalId?: number }> {
  try {
    const toleranceMs = toleranceSeconds * 1000;
    const minTimestamp = timestamp - toleranceMs;
    const maxTimestamp = timestamp + toleranceMs;

    const result = await pool.query(
      `SELECT id FROM signals_log 
       WHERE symbol = $1 
         AND timestamp BETWEEN $2 AND $3
         AND signal_type = $4
         AND direction = $5
         AND processed = true
       ORDER BY received_at DESC
       LIMIT 1`,
      [symbol, minTimestamp, maxTimestamp, signalType, direction]
    );

    if (result.rows.length > 0) {
      return {
        isDuplicate: true,
        existingSignalId: result.rows[0].id,
      };
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Duplicate detection error:', error);
    // On error, allow the signal through (fail open)
    return { isDuplicate: false };
  }
}

/**
 * Check for duplicate signals and optionally prevent processing
 */
export async function checkAndPreventDuplicate(
  symbol: string,
  timestamp: number,
  signalType: string,
  direction: string
): Promise<{ allowed: boolean; reason?: string; existingSignalId?: number }> {
  const duplicateCheck = await isDuplicateSignal(symbol, timestamp, signalType, direction);
  
  if (duplicateCheck.isDuplicate) {
    return {
      allowed: false,
      reason: `Duplicate signal detected. Similar signal already processed (ID: ${duplicateCheck.existingSignalId})`,
      existingSignalId: duplicateCheck.existingSignalId,
    };
  }

  return { allowed: true };
}


