import { NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST() {
  try {
    const backupFolderRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('db_backup_folder') as any;
    if (!backupFolderRow || !backupFolderRow.value || backupFolderRow.value.trim() === '') {
      return NextResponse.json({ error: 'Please set and save a backup folder first.' }, { status: 400 });
    }

    const targetDir = backupFolderRow.value.trim();
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
