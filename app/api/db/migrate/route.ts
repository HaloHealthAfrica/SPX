import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Temporary migration endpoint
 * ⚠️ DELETE THIS FILE AFTER RUNNING MIGRATIONS!
 * 
 * Usage: Visit https://your-project.vercel.app/api/db/migrate
 */
export async function GET() {
  // Optional: Add basic security (remove after migration)
  const authHeader = process.env.CRON_SECRET;
  if (authHeader) {
    // You can add authentication here if needed
    // For now, we'll allow it (delete this route after migration!)
  }

  try {
    console.log('[Migration] Starting database migrations...');
    
    // Run migration script via node
    const { stdout, stderr } = await execAsync('node scripts/migrate.js');
    if (stderr) {
      console.warn('[Migration] Warnings:', stderr);
    }
    console.log('[Migration] Output:', stdout);
    
    console.log('[Migration] Migrations completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Database migrations completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Migration] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

