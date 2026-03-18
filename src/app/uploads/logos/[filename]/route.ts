import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// This route manually serves team logos from the persistent volume.
// This is necessary because Next.js standalone mode might not pick up 
// new files added to the public directory at runtime.

type Params = { params: Promise<{ filename: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { filename } = await params;
    
    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filepath = path.join(process.cwd(), 'public', 'uploads', 'logos', safeFilename);

    if (!existsSync(filepath)) {
      return new NextResponse('Logo not found', { status: 404 });
    }

    const buffer = await readFile(filepath);
    
    // Determine content type based on extension
    const ext = path.extname(safeFilename).toLowerCase();
    const contentType = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error serving logo:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
