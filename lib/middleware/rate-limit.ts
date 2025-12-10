import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (use Redis in production)
const store: RateLimitStore = {};

/**
 * Rate limiting middleware
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return (request: NextRequest): { allowed: boolean; remaining?: number; resetTime?: number } => {
    // Get identifier (IP address or API key)
    const identifier = request.headers.get('x-api-key') || 
                      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      request.ip ||
                      'unknown';

    const now = Date.now();
    const key = `${identifier}:${request.nextUrl.pathname}`;

    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      Object.keys(store).forEach(k => {
        if (store[k].resetTime < now) {
          delete store[k];
        }
      });
    }

    const record = store[key];

    if (!record || record.resetTime < now) {
      // Create new record
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: store[key].resetTime,
      };
    }

    if (record.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetTime: record.resetTime,
    };
  };
}

/**
 * Wrapper function to add rate limiting to API routes
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  maxRequests: number = 100,
  windowMs: number = 60000
) {
  return async (request: NextRequest) => {
    const limitCheck = rateLimit(maxRequests, windowMs);
    const result = limitCheck(request);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetTime: result.resetTime,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetTime?.toString() || '',
            'Retry-After': Math.ceil((result.resetTime! - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const response = await handler(request);
    
    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', (result.remaining || 0).toString());
    if (result.resetTime) {
      response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
    }

    return response;
  };
}


