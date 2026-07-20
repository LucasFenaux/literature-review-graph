import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const pendingStmt = db.prepare(`SELECT count(*) as count FROM retry_queue WHERE status = 'pending'`);
    const pendingCount = pendingStmt.get() as { count: number };
    
    const failedStmt = db.prepare(`SELECT count(*) as count FROM retry_queue WHERE status = 'failed'`);
    const failedCount = failedStmt.get() as { count: number };
    
    return NextResponse.json({ 
      pending: pendingCount.count,
      failed: failedCount.count
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
