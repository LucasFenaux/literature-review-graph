import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database;
let lastBackupCheck = 0;

export function getDb() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'papers.db');
    db = new Database(dbPath, { verbose: console.log, timeout: 5000 });
    db.pragma('journal_mode = WAL');

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

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS s2_api_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL,
        cached INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      db.exec(`ALTER TABLE papers ADD COLUMN publicationDate TEXT;`);
    } catch (error) {
      // Column likely already exists
    }
  }

  const now = Date.now();
  if (now - lastBackupCheck > 60000) {
    lastBackupCheck = now;
    setTimeout(performSmartBackup, 0); 
  }

  return db;
}

async function performSmartBackup() {
  try {
    const backupFolderRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('db_backup_folder') as any;
    if (!backupFolderRow || !backupFolderRow.value || backupFolderRow.value.trim() === '') return;

    const checkAndLock = db.transaction(() => {
      const lastBackupRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('last_db_backup_time') as any;
      const lastBackupTime = lastBackupRow ? parseInt(lastBackupRow.value, 10) : 0;
      
      // Backup every 12 hours
      if (Date.now() - lastBackupTime < 12 * 60 * 60 * 1000) {
        return false;
      }

      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('last_db_backup_time', Date.now().toString());
      return true;
    });

    const shouldBackup = checkAndLock.exclusive();
    if (!shouldBackup) return;

    const targetDir = backupFolderRow.value.trim();
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(targetDir, `papers_backup_${dateStr}.db`);
    
    await db.backup(backupPath);

    // Clean up old backups (keep last 7)
    const files = fs.readdirSync(targetDir)
      .filter(f => f.startsWith('papers_backup_') && f.endsWith('.db'))
      .map(f => ({ name: f, time: fs.statSync(path.join(targetDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 7) {
      for (let i = 7; i < files.length; i++) {
        fs.unlinkSync(path.join(targetDir, files[i].name));
      }
    }
    console.log(`[DB Backup] Successfully created backup at ${backupPath}`);
  } catch (err) {
    console.error('[DB Backup] Smart DB Backup failed:', err);
  }
}

export async function restoreDbFromBackup(backupPath: string) {
  if (!db) {
    throw new Error('Database is not initialized.');
  }

  const backupFolderRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('db_backup_folder') as any;
  let preRestorePath = path.join(process.cwd(), 'papers_pre_restore_backup.db');
  
  if (backupFolderRow && backupFolderRow.value && backupFolderRow.value.trim() !== '') {
    const targetDir = backupFolderRow.value.trim();
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    preRestorePath = path.join(targetDir, 'papers_pre_restore_backup.db');
  }

  await db.backup(preRestorePath);
  db.close();

  const dbPath = path.join(process.cwd(), 'papers.db');
  fs.copyFileSync(backupPath, dbPath);

  (db as any) = undefined;

  return preRestorePath;
}

// For backward compatibility where other files just imported db directly
export default new Proxy({}, {
  get(target, prop) {
    const database = getDb();
    const value = (database as any)[prop];
    return typeof value === 'function' ? value.bind(database) : value;
  }
}) as Database.Database;
