import { z } from 'zod';

/**
 * Zod validation schemas for API endpoints
 */

export const TradingViewSignalSchema = z.object({
  symbol: z.string().min(1).max(10),
  resolution: z.string().optional().default('1D'),
  timestamp: z.number().int().positive(),
  signal_type: z.string().min(1),
  direction: z.enum(['LONG', 'SHORT']),
  confidence: z.number().min(0).max(10),
  signal_strength: z.number().min(0).max(10).optional(),
  confluence_count: z.number().int().min(0).optional(),
  entry_price: z.number().positive(),
  stop_loss: z.number().positive(),
  take_profit_1: z.number().positive(),
  active_signals: z.array(z.string()).min(1),
});

export const ProcessDecisionSchema = z.object({
  signal_id: z.number().int().positive(),
});

export const ExecuteTradeSchema = z.object({
  decision_id: z.number().int().positive(),
  signal_id: z.number().int().positive(),
  symbol: z.string().min(1),
  direction: z.enum(['LONG', 'SHORT']),
  entry_price: z.number().positive(),
  stop_loss: z.number().positive(),
  take_profit_1: z.number().positive(),
  quantity: z.number().int().positive(),
});

export const ListTradesSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED', 'ALL']).optional().default('ALL'),
  symbol: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
});

export const ListSignalsSchema = z.object({
  symbol: z.string().optional(),
  processed: z.boolean().optional(),
  limit: z.number().int().min(1).max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
});

export const ListDecisionsSchema = z.object({
  limit: z.number().int().min(1).max(1000).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

/**
 * Validate request body against schema
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
    }
    return { success: false, error: 'Validation failed' };
  }
}

