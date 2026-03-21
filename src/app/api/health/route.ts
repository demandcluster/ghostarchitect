import { NextResponse } from 'next/server';
import { access, constants } from 'fs/promises';
import path from 'path';

export async function GET() {
  let uploadsWritable = false;
  try {
    // Just check if we can access it or the parent if it doesn't exist yet
    await access(path.join(process.cwd(), 'public', 'uploads'), constants.W_OK);
    uploadsWritable = true;
  } catch {
    uploadsWritable = false;
  }

  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    storage: {
      uploadsWritable
    }
  });
}
