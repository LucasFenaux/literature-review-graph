import Database from 'better-sqlite3';

const db = new Database('./papers.db');
const papers = db.prepare("SELECT id, year, publicationDate FROM papers WHERE publicationDate IS NULL").all();

const updateStmt = db.prepare("UPDATE papers SET publicationDate = ? WHERE id = ?");

async function run() {
  let count = 0;
  for (const p of papers) {
    let pubDate = null;
    try {
      if (p.id.startsWith('W')) {
        const url = `https://api.openalex.org/works/${p.id}?mailto=lucasfenaux@gmail.com`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          pubDate = data.publication_date || null;
        }
      } else if (p.id.startsWith('s2:')) {
        const s2Id = p.id.replace('s2:', '');
        const url = `https://api.semanticscholar.org/graph/v1/paper/${s2Id}?fields=publicationDate`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          pubDate = data.publicationDate || null;
        }
      }
      
      if (!pubDate && p.year) {
        pubDate = `${p.year}-01-01`; // Fallback to year if API doesn't have it
      }
      
      if (pubDate) {
        updateStmt.run(pubDate, p.id);
        count++;
        console.log(`Updated ${p.id} -> ${pubDate}`);
      }
      
      await new Promise(r => setTimeout(r, 100)); // rate limiting
    } catch (e) {
      console.error(`Error fetching ${p.id}:`, e.message);
    }
  }
  console.log(`Successfully updated ${count}/${papers.length} papers`);
}

run();
