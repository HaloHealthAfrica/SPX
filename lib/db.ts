import { Pool } from 'pg';

// Vercel serverless-optimized pool configuration
// In serverless environments, we need smaller pools and faster timeouts
const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

// Support both DATABASE_URL and POSTGRES_URL (Vercel Postgres uses POSTGRES_URL)
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

const pool = new Pool({
  connectionString,
  // Serverless-optimized settings
  max: isVercel ? 1 : 20, // Single connection for serverless (Vercel reuses connections)
  idleTimeoutMillis: isVercel ? 10000 : 30000, // Faster timeout for serverless
  connectionTimeoutMillis: isVercel ? 10000 : 2000, // Longer timeout for Neon connections
  // SSL required for production/Vercel (Neon requires SSL)
  ssl: process.env.NODE_ENV === 'production' || isVercel 
    ? { rejectUnauthorized: false } 
    : false,
  // Allow exit on idle for serverless
  allowExitOnIdle: isVercel,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;

