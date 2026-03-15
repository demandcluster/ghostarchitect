import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';

export async function POST(_request: NextRequest) {
  try {
    const prisma = requirePrisma();

    const existing = await prisma.admin.findFirst();
    if (existing) {
      return NextResponse.json({ exists: true }, { status: 200 });
    }

    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'ADMIN_USERNAME and ADMIN_PASSWORD env vars required for initialization' },
        { status: 400 },
      );
    }

    const passwordHash = await hash(password, 12);
    const admin = await prisma.admin.create({
      data: { username, passwordHash },
    });

    return NextResponse.json({ ok: true, username: admin.username }, { status: 201 });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Admin init error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
