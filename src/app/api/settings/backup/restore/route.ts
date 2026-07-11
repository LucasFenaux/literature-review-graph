import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { restoreDbFromBackup } from '@/lib/db';

const execAsync = promisify(exec);

export async function GET() {
  if (process.platform !== 'darwin') {
    return NextResponse.json({ error: 'Native file picker is only supported on macOS.' }, { status: 400 });
  }
  
  try {
    const { stdout } = await execAsync(`osascript -e 'POSIX path of (choose file with prompt "Select Backup DB to Load" of type {"db"})'`);
    return NextResponse.json({ path: stdout.trim() });
  } catch (err: any) {
    if (err.message && err.message.includes('User canceled')) {
      return NextResponse.json({ canceled: true });
    }
    return NextResponse.json({ error: `Failed to open file picker: ${err.message}` }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { backupPath } = await request.json();
    if (!backupPath) {
      return NextResponse.json({ error: 'Backup path is required' }, { status: 400 });
    }
    const preRestorePath = await restoreDbFromBackup(backupPath);
    return NextResponse.json({ success: true, preRestorePath });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
