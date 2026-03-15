import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';
import { setRefreshCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const prisma = requirePrisma();
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const trainer = await prisma.trainer.findUnique({ where: { username } });
    if (!trainer) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await compare(password, trainer.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const accessToken = await signAccessToken(trainer.id, trainer.username);
    const refreshToken = await signRefreshToken(trainer.id, trainer.username);

    const response = NextResponse.json({
      id: trainer.id,
      username: trainer.username,
      accessToken,
    });
    setRefreshCookie(response, refreshToken);
    return response;
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
