import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to verify API key authentication
 * Checks for API key in header or query parameter
 */
export function verifyApiKey(request: NextRequest): { authorized: boolean; error?: string } {
  // Get API key from environment or use default for development
  const validApiKey = process.env.WEBHOOK_API_KEY || process.env.API_KEY;
  
  // If no API key is configured, allow requests (for TradingView webhooks)
  // This allows webhooks to work without requiring API key setup
  if (!validApiKey) {
    // In production, log a warning but allow the request
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Auth] No API key configured - allowing request (consider setting WEBHOOK_API_KEY for security)');
    }
    return { authorized: true };
  }

  // Check header first (preferred method)
  const headerKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  // Check query parameter as fallback
  const queryKey = request.nextUrl.searchParams.get('api_key');

  const providedKey = headerKey || queryKey;

  if (!providedKey) {
    return { authorized: false, error: 'API key required. Provide via x-api-key header or api_key query parameter' };
  }

  if (providedKey !== validApiKey) {
    return { authorized: false, error: 'Invalid API key' };
  }

  return { authorized: true };
}

/**
 * Wrapper function to protect API routes with authentication
 */
export function withAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authResult = verifyApiKey(request);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    return handler(request);
  };
}


