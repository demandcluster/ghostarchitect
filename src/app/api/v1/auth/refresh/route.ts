import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/jwt';
import { setRefreshCookie } from '@/lib/auth';
import { requirePrisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refreshToken')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  try {
    const payload = await verifyRefreshToken(refreshToken);
    const prisma = requirePrisma();
    const trainer = await prisma.trainer.findUnique({
      where: { id: payload.sub as string },
      select: { id: true, username: true, mustChangePassword: true }
    });

    if (!trainer) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const accessToken = await signAccessToken(trainer.id, trainer.username);
    const newRefreshToken = await signRefreshToken(trainer.id, trainer.username);

    const response = NextResponse.json({ 
      accessToken,
      mustChangePassword: trainer.mustChangePassword 
    });
    setRefreshCookie(response, newRefreshToken);
    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
  }
}
