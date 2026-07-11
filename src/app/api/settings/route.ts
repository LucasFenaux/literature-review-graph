import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    let apiKey = '';
    let rateLimit = '1';
    
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const matchKey = content.match(/^SEMANTIC_SCHOLAR_API_KEY=(.*)$/m);
      if (matchKey) apiKey = matchKey[1].trim();
      
      const matchLimit = content.match(/^SEMANTIC_SCHOLAR_RATE_LIMIT=(.*)$/m);
      if (matchLimit) rateLimit = matchLimit[1].trim();
    } else {
      if (process.env.SEMANTIC_SCHOLAR_API_KEY) apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
      if (process.env.SEMANTIC_SCHOLAR_RATE_LIMIT) rateLimit = process.env.SEMANTIC_SCHOLAR_RATE_LIMIT;
    }
    
    // Fetch db backup folder from DB
    let dbBackupFolder = '';
    try {
      const db = require('@/lib/db').default;
      const backupFolderRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('db_backup_folder') as any;
      if (backupFolderRow && backupFolderRow.value) {
        dbBackupFolder = backupFolderRow.value;
      }
    } catch (e) {
      console.error('Failed to fetch backup folder', e);
    }
    
    return NextResponse.json({ 
      semanticScholarApiKey: apiKey,
      semanticScholarRateLimit: rateLimit,
      dbBackupFolder
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { semanticScholarApiKey, semanticScholarRateLimit } = await request.json();
    const envPath = path.join(process.cwd(), '.env.local');
    
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Replace or add the key
    if (envContent.match(/^SEMANTIC_SCHOLAR_API_KEY=.*$/m)) {
      envContent = envContent.replace(/^SEMANTIC_SCHOLAR_API_KEY=.*$/m, `SEMANTIC_SCHOLAR_API_KEY=${semanticScholarApiKey}`);
    } else {
      envContent += `\nSEMANTIC_SCHOLAR_API_KEY=${semanticScholarApiKey}\n`;
    }
    
    // Replace or add rate limit
    if (envContent.match(/^SEMANTIC_SCHOLAR_RATE_LIMIT=.*$/m)) {
      envContent = envContent.replace(/^SEMANTIC_SCHOLAR_RATE_LIMIT=.*$/m, `SEMANTIC_SCHOLAR_RATE_LIMIT=${semanticScholarRateLimit}`);
    } else {
      envContent += `\nSEMANTIC_SCHOLAR_RATE_LIMIT=${semanticScholarRateLimit}\n`;
    }
    
    // Clean up empty lines
    envContent = envContent.replace(/^\s*[\r\n]/gm, '\n').trim() + '\n';
    
    fs.writeFileSync(envPath, envContent, 'utf8');
    
    // Assigning to process.env works for the current runtime tick in Node
    process.env.SEMANTIC_SCHOLAR_API_KEY = semanticScholarApiKey;
    process.env.SEMANTIC_SCHOLAR_RATE_LIMIT = semanticScholarRateLimit;
    
    return NextResponse.json({ message: 'Settings saved successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
