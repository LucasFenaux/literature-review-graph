export function formatAuthorName(name: string): string {
  if (!name) return '';
  if (name.includes(',')) {
    const parts = name.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return '';
    const last = parts[0];
    const firstInitial = parts.length > 1 && parts[1].length > 0 ? parts[1][0].toUpperCase() + '.' : '';
    return firstInitial ? `${last} ${firstInitial}` : last;
  } else {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    const last = parts[parts.length - 1];
    const firstInitial = parts.length > 1 ? parts[0][0].toUpperCase() + '.' : '';
    return firstInitial ? `${last} ${firstInitial}` : last;
  }
}

export function formatAuthors(authors: string | string[] | any[]): string {
  if (!authors) return '';
  
  let authorsList: string[] = [];
  if (Array.isArray(authors)) {
    authorsList = authors.map(a => typeof a === 'string' ? a : (a.name || ''));
  } else if (typeof authors === 'string') {
    try {
      const parsed = JSON.parse(authors);
      authorsList = Array.isArray(parsed) ? parsed.map(a => typeof a === 'string' ? a : (a.name || '')) : [];
    } catch {
      authorsList = authors.split(',').map(s => s.trim());
    }
  }
  
  return authorsList.filter(Boolean).map(formatAuthorName).join(', ');
}
