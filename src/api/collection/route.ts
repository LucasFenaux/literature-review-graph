import { NextResponse } from 'next/server';
import db from '@/lib/db';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const collectionId = searchParams.get('collectionId');
  if (!collectionId) return NextResponse.json({ error: 'collectionId required' }, { status: 400 });

  try {
    const stmt = db.prepare('SELECT * FROM papers WHERE collectionId = ? ORDER BY createdAt DESC');
    const rows = stmt.all(collectionId);
    
    const papers = rows.map((row: any) => ({
      ...row,
      authors: JSON.parse(row.authors || '[]'),
      localTags: JSON.parse(row.localTags || '[]')
    }));
    
    return NextResponse.json(papers);
  } catch (error: any) {
    console.error('Database GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, status = 'seed', collectionId } = body;
    
    if (!id || !collectionId) {
      return NextResponse.json({ error: 'Paper ID and collectionId are required' }, { status: 400 });
    }

    // First check if it already exists
    const checkStmt = db.prepare('SELECT id, status FROM papers WHERE id = ? AND collectionId = ?');
    const existing = checkStmt.get(id, collectionId) as { id: string, status: string } | undefined;
    
    if (existing) {
      if (existing.status !== status) {
        db.prepare('UPDATE papers SET status = ? WHERE id = ? AND collectionId = ?').run(status, id, collectionId);
        return NextResponse.json({ message: 'Paper status updated' }, { status: 200 });
      }
      return NextResponse.json({ message: 'Paper already in collection' }, { status: 200 });
    }

    // We expect the full paper details to be provided in the request body
    const paper = body;
    
    if (!paper || !paper.title) {
      return NextResponse.json({ error: 'Full paper details are required' }, { status: 400 });
    }

    const insertStmt = db.prepare(`
      INSERT INTO papers (id, collectionId, doi, title, abstract, authors, year, publicationDate, citationCount, url, venue, status, localTags, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '')
    `);

    // Handle authors robustly: if it's already a string, stringify it into a JSON array of strings, or just save it as is.
    let authorsJson = '[]';
    if (Array.isArray(paper.authors)) {
      authorsJson = JSON.stringify(paper.authors);
    } else if (typeof paper.authors === 'string') {
      try {
        JSON.parse(paper.authors);
        authorsJson = paper.authors;
      } catch {
        authorsJson = JSON.stringify([paper.authors]);
      }
    }

    insertStmt.run(
      paper.id,
      collectionId,
      paper.doi || null,
      paper.title,
      paper.abstract || '',
      authorsJson,
      paper.year || new Date().getFullYear(),
      paper.publicationDate || null,
      paper.citationCount || 0,
      paper.url || '',
      paper.venue || '',
      status
    );

    return NextResponse.json({ message: 'Paper added successfully', paper });
  } catch (error: any) {
    console.error('Database POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
