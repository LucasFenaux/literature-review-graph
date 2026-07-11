/**
 * Google-style search matching.
 * - Terms in double quotes ("...") are matched as exact phrases.
 * - Unquoted terms are matched individually (all must be present).
 * - Matching is case-insensitive.
 * - Searches across title, authors, and abstract.
 */
export function matchesSearch(
  query: string,
  fields: string[]
): boolean {
  if (!query.trim()) return true;

  const combined = fields.map(f => (f || '').toLowerCase()).join(' ');

  // Extract quoted phrases and unquoted words
  const tokens: { text: string; exact: boolean }[] = [];
  const quoteRegex = /"([^"]+)"/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = quoteRegex.exec(query)) !== null) {
    // Grab any unquoted text before this match
    const before = query.slice(lastIndex, match.index).trim();
    if (before) {
      before.split(/\s+/).filter(Boolean).forEach(word => {
        tokens.push({ text: word.toLowerCase(), exact: false });
      });
    }
    tokens.push({ text: match[1].toLowerCase(), exact: true });
    lastIndex = quoteRegex.lastIndex;
  }

  // Remaining unquoted text after last quote
  const remaining = query.slice(lastIndex).trim();
  if (remaining) {
    remaining.split(/\s+/).filter(Boolean).forEach(word => {
      tokens.push({ text: word.toLowerCase(), exact: false });
    });
  }

  // All tokens must match
  return tokens.every(token => combined.includes(token.text));
}
