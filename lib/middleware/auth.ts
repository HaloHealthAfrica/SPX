import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to verify API key authentication
 * Checks for API key in header or query parameter
 */
export function verifyApiKey(request: NextRequest): { authorized: boolean; error?: string } {
  // Get API key from environment or use default for development
  const validApiKey = process.env.WEBHOOK_API_KEY || process.env.API_KEY;
  
  // If no API key is configured, allow in development mode
  if (!validApiKey && process.env.NODE_ENV === 'development') {
    return { authorized: true };
  }

  if (!validApiKey) {
    return { authorized: false, error: 'API key not configured' };
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


