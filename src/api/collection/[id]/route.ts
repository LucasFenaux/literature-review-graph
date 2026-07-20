import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get('collectionId');
    if (!collectionId) return NextResponse.json({ error: 'collectionId required' }, { status: 400 });

    const body = await request.json();
    const { status, localTags, notes } = body;
    
    const currentStmt = db.prepare('SELECT status, localTags, notes FROM papers WHERE id = ? AND collectionId = ?');
    const current = currentStmt.get(id, collectionId) as any;
    
    if (!current) {
      return NextResponse.json({ error: 'Paper not found in collection' }, { status: 404 });
    }

    const newStatus = status !== undefined ? status : current.status;
    const newTags = localTags !== undefined ? JSON.stringify(localTags) : current.localTags;
    const newNotes = notes !== undefined ? notes : current.notes;

    const updateStmt = db.prepare(`
      UPDATE papers 
      SET status = ?, localTags = ?, notes = ?
      WHERE id = ? AND collectionId = ?
    `);

    updateStmt.run(newStatus, newTags, newNotes, id, collectionId);

    return NextResponse.json({ message: 'Paper updated successfully' });
  } catch (error: any) {
    console.error('Database PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get('collectionId');
    if (!collectionId) return NextResponse.json({ error: 'collectionId required' }, { status: 400 });
    
    const deleteStmt = db.prepare('DELETE FROM papers WHERE id = ? AND collectionId = ?');
    deleteStmt.run(id, collectionId);

    return NextResponse.json({ message: 'Paper deleted successfully' });
  } catch (error: any) {
    console.error('Database DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
