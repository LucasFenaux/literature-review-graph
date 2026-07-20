import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getS2PaperByTitle, getS2Citations, getS2References } from '@/lib/semanticscholar';
import { getPaperDetails, getCitations, getWorksByIds } from '@/lib/openalex';

export async function POST(request: Request) {
  try {
    // 1. Fetch up to 5 pending items from retry_queue
    const pendingStmt = db.prepare(`SELECT * FROM retry_queue WHERE status = 'pending' ORDER BY createdAt ASC LIMIT 5`);
    const pendingItems = pendingStmt.all() as any[];

    if (pendingItems.length === 0) {
      return NextResponse.json({ message: 'No pending items' });
    }

    const markStatus = db.prepare(`UPDATE retry_queue SET status = ? WHERE id = ?`);

    for (const item of pendingItems) {
      const { id, paperId, type } = item;
      try {
        let citations: any[] = [];
        let references: any[] = [];
        let paper: any = null;

        let targetS2Id = paperId.startsWith('s2:') ? paperId.replace('s2:', '') : null;

        if (!targetS2Id) {
          paper = await getPaperDetails(paperId);
          if (paper && paper.title) {
            targetS2Id = await getS2PaperByTitle(paper.title);
          }
        }

        if (targetS2Id) {
          if (type === 'citations' || type === 'both') citations = await getS2Citations(targetS2Id);
          if (type === 'references' || type === 'both') references = await getS2References(targetS2Id);
        } else {
          // If we couldn't resolve S2, use OpenAlex natively
          if (type === 'citations' || type === 'both') {
            citations = await getCitations(paperId, 20); 
          }
          if (type === 'references' || type === 'both') {
            if (!paper) paper = await getPaperDetails(paperId);
            const referenceIds = paper?.referencedWorks?.slice(0, 20) || [];
            if (referenceIds.length > 0) {
              references = await getWorksByIds(referenceIds);
            }
          }
        }

        // If successful (no rate limit thrown), mark completed
        // Note: fetchWithCache inside semantic scholar/openalex will automatically cache the result
        markStatus.run('completed', id);

        // Optional delay between processing items in the queue
        await new Promise(r => setTimeout(r, 1000));
      } catch (err: any) {
        if (err.message === 'S2_RATE_LIMIT') {
          // Leave it as pending for the next tick
          console.warn(`Queue item ${id} hit rate limit, deferring...`);
          break; // Stop processing further items in this tick to respect rate limit
        } else {
          console.error(`Queue item ${id} failed:`, err);
          markStatus.run('failed', id);
        }
      }
    }

    return NextResponse.json({ message: `Processed queue batch` });
  } catch (error: any) {
    console.error('Queue API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
