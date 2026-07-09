import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stmt = db.prepare('SELECT * FROM collections ORDER BY createdAt DESC');
    const collections = stmt.all();
    return NextResponse.json(collections);
  } catch (error: any) {
    console.error('Collections GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
    }

    const id = randomUUID();
    const insertStmt = db.prepare('INSERT INTO collections (id, name) VALUES (?, ?)');
    insertStmt.run(id, name);

    return NextResponse.json({ id, name });
  } catch (error: any) {
    console.error('Collections POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
