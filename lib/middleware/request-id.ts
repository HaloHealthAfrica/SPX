import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Add request ID to request headers and response
 */
export function withRequestId(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    // Get or generate request ID
    const requestId = request.headers.get('x-request-id') || generateRequestId();
    
    // Add to request context (for logging)
    (request as any).requestId = requestId;

    // Call handler
    const response = await handler(request);

    // Add request ID to response headers
    response.headers.set('X-Request-ID', requestId);

    return response;
  };
}

/**
 * Get request ID from request (for logging)
 */
export function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || (request as any).requestId || 'unknown';
}


