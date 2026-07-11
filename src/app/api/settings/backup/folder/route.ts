import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import db from '@/lib/db';

const execAsync = promisify(exec);

export async function GET() {
  if (process.platform !== 'darwin') {
    return NextResponse.json({ error: 'Native folder picker is only supported on macOS.' }, { status: 400 });
  }
  
  try {
    const { stdout } = await execAsync(`osascript -e 'POSIX path of (choose folder with prompt "Select Backup Folder")'`);
    return NextResponse.json({ path: stdout.trim() });
  } catch (err: any) {
    if (err.message && err.message.includes('User canceled')) {
      return NextResponse.json({ canceled: true });
    }
    return NextResponse.json({ error: `Failed to open folder picker: ${err.message}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { folderPath } = await request.json();
    if (!folderPath) {
      return NextResponse.json({ error: 'Folder path is required' }, { status: 400 });
    }
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('db_backup_folder', folderPath);
    return NextResponse.json({ success: true, folderPath });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
