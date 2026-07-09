import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'papers.db');
const db = new Database(dbPath, { verbose: console.log, timeout: 5000 });

db.pragma('journal_mode = WAL');

const initDb = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS papers (
      id TEXT,
      collectionId TEXT,
      doi TEXT,
      title TEXT NOT NULL,
      abstract TEXT,
      authors TEXT,
      year INTEGER,
      citationCount INTEGER,
      url TEXT,
      venue TEXT,
      status TEXT DEFAULT 'recommended',
      localTags TEXT,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id, collectionId),
      FOREIGN KEY (collectionId) REFERENCES collections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS citations (
      collectionId TEXT,
      sourceId TEXT,
      targetId TEXT,
      PRIMARY KEY (collectionId, sourceId, targetId),
      FOREIGN KEY (collectionId) REFERENCES collections(id) ON DELETE CASCADE,
      FOREIGN KEY (sourceId, collectionId) REFERENCES papers(id, collectionId) ON DELETE CASCADE,
      FOREIGN KEY (targetId, collectionId) REFERENCES papers(id, collectionId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS api_cache (
      key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS retry_queue (
      id TEXT PRIMARY KEY,
      paperId TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.exec(`ALTER TABLE papers ADD COLUMN publicationDate TEXT;`);
  } catch (error) {
    // Column likely already exists
  }
};

initDb();

export default db;
