import { NextResponse } from 'next/server';
import { getS2PapersByDois } from '@/lib/semanticscholar';

export async function POST(request: Request) {
  try {
    const { dois } = await request.json();
    
    if (!dois || !Array.isArray(dois)) {
      return NextResponse.json({ error: 'dois array is required' }, { status: 400 });
    }

    const results = await getS2PapersByDois(dois);
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Batch search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
