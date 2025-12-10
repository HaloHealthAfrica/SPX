import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { TradingViewSignal } from '@/lib/types';
import { withAuth } from '@/lib/middleware/auth';
import { withRateLimit } from '@/lib/middleware/rate-limit';
import { TradingViewSignalSchema, validateRequest } from '@/lib/validation/schemas';
import { checkAndPreventDuplicate } from '@/lib/utils/duplicate-detection';
import { retry } from '@/lib/utils/retry';
import { withRequestId, getRequestId } from '@/lib/middleware/request-id';

/**
 * Process signal with retry logic
 */
async function processSignalWithRetry(origin: string, signalId: number): Promise<void> {
  await retry(
    async () => {
      const response = await fetch(`${origin}/api/decision/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal_id: signalId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Decision processing failed: ${response.status} - ${errorData.error || response.statusText}`);
      }

      return response.json();
    },
    {
      maxAttempts: 3,
      delayMs: 2000,
      backoffMultiplier: 2,
      onRetry: (attempt, error) => {
        console.warn(`Retrying signal processing (attempt ${attempt}/${3}):`, error.message);
      },
    }
  );
}

async function handleWebhook(request: NextRequest) {
  const requestId = getRequestId(request);
  
  try {
    const body = await request.json();
    
    // Log request with ID
    console.log(`[${requestId}] Webhook received for symbol: ${body.symbol}`);

    // Validate with Zod schema
    const validation = validateRequest(TradingViewSignalSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error },
        { status: 400 }
      );
    }

    const validatedBody = validation.data;

    // Check for duplicate signals
    const duplicateCheck = await checkAndPreventDuplicate(
      validatedBody.symbol,
      validatedBody.timestamp,
      validatedBody.signal_type,
      validatedBody.direction
    );

    if (!duplicateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate signal',
          details: duplicateCheck.reason,
          existing_signal_id: duplicateCheck.existingSignalId,
        },
        { status: 409 } // Conflict status code
      );
    }

    // Insert signal into database
    const result = await pool.query(
      `INSERT INTO signals_log (
        symbol, resolution, timestamp, signal_type, direction,
        confidence, signal_strength, confluence_count,
        entry_price, stop_loss, take_profit_1, active_signals, processed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        validatedBody.symbol,
        validatedBody.resolution || '1D',
        validatedBody.timestamp,
        validatedBody.signal_type,
        validatedBody.direction,
        validatedBody.confidence,
        validatedBody.signal_strength || validatedBody.confidence,
        validatedBody.confluence_count || validatedBody.active_signals?.length || 0,
        validatedBody.entry_price,
        validatedBody.stop_loss,
        validatedBody.take_profit_1,
        JSON.stringify(validatedBody.active_signals || []),
        false,
      ]
    );

    const signalId = result.rows[0].id;

    // Check if auto-trade is enabled and should handle this signal
    // (Auto-trade orchestrator will process via signal processor in decision route)
    // Still trigger decision processing for audit trail
    processSignalWithRetry(request.nextUrl.origin, signalId).catch(err => {
      console.error('Failed to process signal after retries:', err);
      // Mark signal as failed to process
      pool.query(
        'UPDATE signals_log SET processed = false WHERE id = $1',
        [signalId]
      ).catch(updateErr => {
        console.error('Failed to update signal status:', updateErr);
      });
    });

    return NextResponse.json({ 
      success: true, 
      signal_id: signalId,
      message: 'Signal received and processing triggered' 
    });
  } catch (error: any) {
    const requestId = getRequestId(request);
    console.error(`[${requestId}] Webhook error:`, error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        request_id: requestId 
      },
      { status: 500 }
    );
  }
}

// Apply request ID, authentication and rate limiting (100 requests per minute)
export const POST = withRequestId(
  withRateLimit(
    withAuth(handleWebhook),
    100, // max 100 requests
    60000 // per minute
  )
);

