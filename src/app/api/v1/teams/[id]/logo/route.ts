import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { requireTrainer } from '@/lib/auth';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';

// No Edge runtime — Node.js only

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const prisma = requirePrisma();
    const result = await requireTrainer(request);
    if (result instanceof NextResponse) return result;
    const { id } = await params;

    // Verify trainer owns this team
    const team = await prisma.team.findFirst({
      where: { id, trainerId: result.sub },
    });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('logo');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing logo file field' }, { status: 400 });
    }

    const ext = ALLOWED_MIME[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: jpg, png, gif, webp' },
        { status: 415 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5 MB' },
        { status: 413 },
      );
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
    await mkdir(uploadsDir, { recursive: true });

    const filename = `${id}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      await writeFile(filepath, buffer);
    } catch (writeError: any) {
      if (writeError.code === 'EACCES' || writeError.code === 'EPERM') {
        return NextResponse.json(
          { error: 'Permission denied: Unable to write to upload directory. Contact administrator.' },
          { status: 500 }
        );
      }
      if (writeError.code === 'ENOSPC') {
        return NextResponse.json(
          { error: 'Disk full: Unable to save logo. Contact administrator.' },
          { status: 500 }
        );
      }
      throw writeError; // Re-throw other errors to be caught by outer catch block
    }

    const logoUrl = `/uploads/logos/${filename}`;
    const updated = await prisma.team.update({
      where: { id },
      data: { logoUrl },
    });

    return NextResponse.json({ logoUrl: updated.logoUrl });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Logo upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
