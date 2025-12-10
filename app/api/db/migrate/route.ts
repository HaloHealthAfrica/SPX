import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Database migration endpoint
 * ⚠️ DELETE THIS FILE AFTER RUNNING MIGRATIONS!
 * 
 * Usage: Visit https://spx-iota.vercel.app/api/db/migrate
 */
export async function GET() {
  try {
    // Run the migration script
    const { stdout, stderr } = await execAsync('node scripts/migrate.js');
    
    if (stderr) {
      console.warn('[Migration] Stderr:', stderr);
    }
    
    console.log('[Migration] Output:', stdout);
    
    return NextResponse.json({
      success: true,
      message: 'Database migrations completed successfully',
      output: stdout,
      warnings: stderr || null,
    });
  } catch (error: any) {
    console.error('[Migration] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        output: error.stdout || null,
        stderr: error.stderr || null,
      },
      { status: 500 }
    );
  }
}

