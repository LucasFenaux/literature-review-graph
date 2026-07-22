import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

export async function GET() {
  try {
    const stmt = db.prepare('SELECT * FROM tags ORDER BY weight DESC, name ASC');
    const tags = stmt.all();
    return NextResponse.json(tags);
  } catch (error: any) {
    console.error('Database GET tags error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, color, weight } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const insertStmt = db.prepare(`
      INSERT INTO tags (id, name, color, weight)
      VALUES (?, ?, ?, ?)
    `);

    insertStmt.run(id, name, color || '#888888', weight || 0);

    return NextResponse.json({ message: 'Tag created successfully', tag: { id, name, color: color || '#888888', weight: weight || 0 } });
  } catch (error: any) {
    console.error('Database POST tags error:', error);
    // Handle unique constraint error
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
