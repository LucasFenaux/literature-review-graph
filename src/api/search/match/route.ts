import { NextResponse } from 'next/server';
import { getS2PaperMatch } from '@/lib/semanticscholar';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const result = await getS2PaperMatch(query);
    // Return as array to be compatible with BibtexImportModal searchResults state
    return NextResponse.json(result ? [result] : []);
  } catch (error: any) {
    console.error('Match error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
