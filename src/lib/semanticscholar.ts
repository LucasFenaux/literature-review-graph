import { Paper } from './openalex';

const S2_API_URL = 'https://api.semanticscholar.org/graph/v1';
const S2_FIELDS = 'paperId,title,year,publicationDate,authors,abstract,venue,citationCount,url';

function getHeaders(): HeadersInit {
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  if (apiKey) {
    return { 'x-api-key': apiKey };
  }
  return {};
}

function mapS2ToPaper(s2Paper: any): Paper {
  return {
    id: `s2:${s2Paper.paperId}`,
    title: s2Paper.title || 'Untitled',
    abstract: s2Paper.abstract || '',
    authors: (s2Paper.authors || []).map((a: any) => a.name).join(', '),
    year: s2Paper.year || new Date().getFullYear(),
    citationCount: s2Paper.citationCount || 0,
    url: s2Paper.url || '',
    venue: s2Paper.venue || '',
    publicationDate: s2Paper.publicationDate || null,
    doi: null,
    referencedWorks: (s2Paper.references || []).map((r: any) => `s2:${r.paperId}`).filter((id: string) => id !== 's2:undefined')
  };
}

async function fetchWithBackoff(url: string, retries = 3): Promise<any> {
  const db = (await import('./db')).default;
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; 
  
  // Check cache
  try {
    const row = db.prepare('SELECT data, timestamp FROM api_cache WHERE key = ?').get(url) as any;
    if (row) {
      const ts = new Date(row.timestamp).getTime();
      if (Date.now() - ts < CACHE_TTL_MS) {
        return { ok: true, json: async () => JSON.parse(row.data) };
      }
    }
  } catch (e) {
    console.error('Cache read error', e);
  }

  let attempt = 0;
  const baseDelay = 1000;
  
  while (attempt < retries) {
    const res = await fetch(url, { headers: getHeaders() });
    if (res.status !== 429) {
      if (res.ok) {
        const cloned = res.clone();
        const data = await cloned.text();
        try {
          db.prepare('INSERT OR REPLACE INTO api_cache (key, data, timestamp) VALUES (?, ?, CURRENT_TIMESTAMP)').run(url, data);
        } catch (e) {
          console.error('Cache write error', e);
        }
      }
      return res;
    }
    attempt++;
    if (attempt >= retries) {
      throw new Error('S2_RATE_LIMIT');
    }
    const delayMs = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error('S2_RATE_LIMIT');
}

export async function searchS2Papers(query: string, limit = 10): Promise<Paper[]> {
  const url = `${S2_API_URL}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${S2_FIELDS},references.paperId`;
  const res = await fetchWithBackoff(url);
  
  if (!res.ok) return [];
  
  const data = await res.json();
  if (data && data.data) {
    return data.data.map(mapS2ToPaper);
  }
  return [];
}

export async function getS2PaperByTitle(title: string): Promise<string | null> {
  const url = `${S2_API_URL}/paper/search?query=${encodeURIComponent(title)}&limit=1&fields=paperId`;
  const res = await fetchWithBackoff(url);
  
  if (!res.ok) return null;
  
  const data = await res.json();
  if (data && data.data && data.data.length > 0) {
    return data.data[0].paperId;
  }
  return null;
}

export async function getS2Citations(paperId: string, limit = 20): Promise<Paper[]> {
  const url = `${S2_API_URL}/paper/${paperId}/citations?limit=${limit}&fields=${S2_FIELDS}`;
  const res = await fetchWithBackoff(url);
  
  if (!res.ok) return [];
  
  const data = await res.json();
  if (!data || !data.data) return [];
  
  return data.data
    .map((d: any) => d.citingPaper)
    .filter((p: any) => p && p.paperId)
    .map(mapS2ToPaper);
}

export async function getS2References(paperId: string, limit = 20): Promise<Paper[]> {
  const url = `${S2_API_URL}/paper/${paperId}/references?limit=${limit}&fields=${S2_FIELDS}`;
  const res = await fetchWithBackoff(url);
  
  if (!res.ok) return [];
  
  const data = await res.json();
  if (!data || !data.data) return [];
  
  return data.data
    .map((d: any) => d.citedPaper)
    .filter((p: any) => p && p.paperId)
    .map(mapS2ToPaper);
}
