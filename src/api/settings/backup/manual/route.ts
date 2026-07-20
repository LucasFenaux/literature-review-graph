import { NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'papers.db');
    const targetDir = path.join(path.dirname(dbPath), 'backups');
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const backupPath = path.join(targetDir, 'papers_manual_backup_latest.db');
    
    // SQLite safe backup
    await db.backup(backupPath);
    return NextResponse.json({ success: true, path: backupPath });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
