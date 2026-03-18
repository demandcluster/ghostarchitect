import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';
import { requireAdmin, type AdminTokenPayload } from '@/lib/adminAuth';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) return authResult;

    const prisma = requirePrisma();

    const trainers = await prisma.trainer.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        acceptedTermsAt: true,
        _count: { select: { teams: true } },
      },
    });

    const result = trainers.map((t) => ({
      id: t.id,
      username: t.username,
      role: t.role,
      createdAt: t.createdAt,
      acceptedTermsAt: t.acceptedTermsAt,
      teamCount: t._count.teams,
    }));

    return NextResponse.json({ trainers: result });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Admin GET trainers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) return authResult;

    const prisma = requirePrisma();
    const { username, password } = await request.json();

    if (!username || !USERNAME_RE.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3–32 characters: letters, digits, or underscore' },
        { status: 400 },
      );
    }
    if (!password || (password as string).length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    const existing = await prisma.trainer.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);
    const trainer = await prisma.trainer.create({
      data: {
        username,
        passwordHash,
        acceptedTermsAt: new Date(),
        mustChangePassword: true,
      },
      select: { id: true, username: true, createdAt: true },
    });

    return NextResponse.json(trainer, { status: 201 });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Admin POST trainer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
