import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    
    // 24 hours ago
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    // 7 days ago
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const total24h = (db.prepare(
      'SELECT COUNT(*) as count FROM s2_api_log WHERE cached = 0 AND timestamp >= ?'
    ).get(since24h) as any)?.count || 0;

    const cached24h = (db.prepare(
      'SELECT COUNT(*) as count FROM s2_api_log WHERE cached = 1 AND timestamp >= ?'
    ).get(since24h) as any)?.count || 0;

    const total7d = (db.prepare(
      'SELECT COUNT(*) as count FROM s2_api_log WHERE cached = 0 AND timestamp >= ?'
    ).get(since7d) as any)?.count || 0;

    const cached7d = (db.prepare(
      'SELECT COUNT(*) as count FROM s2_api_log WHERE cached = 1 AND timestamp >= ?'
    ).get(since7d) as any)?.count || 0;

    const totalAllTime = (db.prepare(
      'SELECT COUNT(*) as count FROM s2_api_log WHERE cached = 0'
    ).get() as any)?.count || 0;

    return NextResponse.json({
      last24h: { api: total24h, cached: cached24h },
      last7d: { api: total7d, cached: cached7d },
      allTime: { api: totalAllTime }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
