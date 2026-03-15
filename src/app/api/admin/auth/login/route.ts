import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';
import { signAdminAccessToken, signAdminRefreshToken, setAdminRefreshCookie } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  try {
    const prisma = requirePrisma();
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await compare(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const accessToken = await signAdminAccessToken(admin.id, admin.username);
    const refreshToken = await signAdminRefreshToken(admin.id, admin.username);

    const response = NextResponse.json({ accessToken, username: admin.username });
    setAdminRefreshCookie(response, refreshToken);
    return response;
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
