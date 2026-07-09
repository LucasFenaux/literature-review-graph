import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams; // this is the collectionId

    db.transaction(() => {
      // Find all papers in this collection that are NOT 'seed' or 'collection'
      const selectStmt = db.prepare(`SELECT id FROM papers WHERE collectionId = ? AND status != 'seed' AND status != 'collection'`);
      const relatedPapers = selectStmt.all(id) as { id: string }[];
      
      const relatedIds = relatedPapers.map(p => p.id);
      
      if (relatedIds.length > 0) {
        // We delete them from papers.
        // Citations table has ON DELETE CASCADE for sourceId/targetId so they'll be cleaned up automatically.
        const placeholders = relatedIds.map(() => '?').join(',');
        const deleteStmt = db.prepare(`DELETE FROM papers WHERE collectionId = ? AND id IN (${placeholders})`);
        deleteStmt.run(id, ...relatedIds);
      }
    })();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Clear Collection API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
