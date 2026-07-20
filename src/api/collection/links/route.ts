import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const collectionId = searchParams.get('collectionId');
  
  if (!collectionId) {
    return NextResponse.json({ error: 'collectionId required' }, { status: 400 });
  }

  try {
    const stmt = db.prepare('SELECT sourceId as source, targetId as target FROM citations WHERE collectionId = ?');
    const links = stmt.all(collectionId);
    return NextResponse.json(links);
  } catch (error: any) {
    console.error('Database GET links error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
