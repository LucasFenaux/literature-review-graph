const Database = require('better-sqlite3');
const db = new Database('./papers.db');
const papers = db.prepare("SELECT id, year, publicationDate FROM papers WHERE publicationDate IS NULL").all();

console.log(`Found ${papers.length} papers missing publicationDate`);
