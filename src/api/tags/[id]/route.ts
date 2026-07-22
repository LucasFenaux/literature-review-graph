import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { name, color, weight } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const currentStmt = db.prepare('SELECT weight FROM tags WHERE id = ?');
    const current = currentStmt.get(id) as any;
    if (!current) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const updateStmt = db.prepare(`
      UPDATE tags 
      SET name = ?, color = ?, weight = ?
      WHERE id = ?
    `);

    updateStmt.run(name, color || '#888888', weight !== undefined ? weight : current.weight, id);

    return NextResponse.json({ message: 'Tag updated successfully', tag: { id, name, color: color || '#888888', weight: weight !== undefined ? weight : current.weight } });
  } catch (error: any) {
    console.error('Database PUT tags error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    const deleteStmt = db.prepare('DELETE FROM tags WHERE id = ?');
    const result = deleteStmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // We should probably also remove the tag from all papers' localTags.
    // However, since localTags is a JSON string of array of IDs, it's non-trivial in SQLite without JSON1 extension.
    // We can rely on the frontend filtering out invalid tag IDs, and eventually cleaning them up on save.
    // For completeness, we could fetch all papers, parse, remove, and update, but it might be slow.
    // Assuming JSON1 is available in better-sqlite3:
    try {
      db.prepare(`
        UPDATE papers 
        SET localTags = (
          SELECT json_group_array(value) 
          FROM json_each(localTags) 
          WHERE value != ?
        )
        WHERE localTags LIKE '%' || ? || '%'
      `).run(id, id);
    } catch (e) {
      console.warn("Failed to clean up tags from papers natively, relying on frontend cleanup.", e);
    }

    return NextResponse.json({ message: 'Tag deleted successfully' });
  } catch (error: any) {
    console.error('Database DELETE tags error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
