import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';
import { setRefreshCookie } from '@/lib/auth';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

export async function POST(request: NextRequest) {
  try {
    const prisma = requirePrisma();
    const { username, password, acceptedTerms } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    if (acceptedTerms !== true) {
      return NextResponse.json({ error: 'You must accept the Terms of Service to register' }, { status: 400 });
    }

    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-32 characters: letters, numbers, and underscores only' },
        { status: 400 },
      );
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
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
        ...(acceptedTerms === true ? { acceptedTermsAt: new Date() } : {}),
      },
    });

    const accessToken = await signAccessToken(trainer.id, trainer.username);
    const refreshToken = await signRefreshToken(trainer.id, trainer.username);

    const response = NextResponse.json(
      { id: trainer.id, username: trainer.username, accessToken },
      { status: 201 },
    );
    setRefreshCookie(response, refreshToken);
    return response;
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
