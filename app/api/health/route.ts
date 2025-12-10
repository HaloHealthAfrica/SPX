import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * Health check endpoint
 * Returns system status and database connectivity
 */
export async function GET(request: NextRequest) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: 'unknown',
      marketData: 'unknown',
    },
    environment: process.env.NODE_ENV || 'development',
  };

  // Check database connection
  try {
    const result = await pool.query('SELECT 1 as health');
    if (result.rows[0]?.health === 1) {
      health.services.database = 'connected';
    } else {
      health.services.database = 'error';
      health.status = 'degraded';
    }
  } catch (error: any) {
    health.services.database = 'disconnected';
    health.status = 'unhealthy';
    (health as any).error = error.message;
  }

  // Check market data configuration
  if (
    process.env.ALPACA_API_KEY ||
    process.env.TRADIER_API_KEY ||
    process.env.TWELVEDATA_API_KEY
  ) {
    health.services.marketData = 'configured';
  } else {
    health.services.marketData = 'mock';
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}


