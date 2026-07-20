import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get('collectionId');
    
    if (collectionId) {
       const papers = db.prepare('SELECT id FROM papers WHERE collectionId = ?').all(collectionId) as {id: string}[];
       const deleteStmt = db.prepare(`DELETE FROM api_cache WHERE key LIKE ?`);
       
       let count = 0;
       // Execute inside a transaction for safety and speed
       const transaction = db.transaction(() => {
         for (const p of papers) {
            // Clean ID to match both OpenAlex and S2 URLs
            const cleanId = p.id.replace('s2:', '');
            const info = deleteStmt.run(`%${cleanId}%`);
            count += info.changes;
         }
       });
       
       transaction();
       return NextResponse.json({ message: `Cleared ${count} cache entries for the active collection` });
    } else {
       const info = db.prepare('DELETE FROM api_cache').run();
       return NextResponse.json({ message: `Cleared all ${info.changes} cache entries` });
    }
  } catch (error: any) {
    console.error('Failed to clear cache', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
