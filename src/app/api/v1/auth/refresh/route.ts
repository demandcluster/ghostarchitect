import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/jwt';
import { setRefreshCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refreshToken')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  try {
    const payload = await verifyRefreshToken(refreshToken);
    const accessToken = await signAccessToken(payload.sub as string, payload.email as string);
    const newRefreshToken = await signRefreshToken(payload.sub as string, payload.email as string);

    const response = NextResponse.json({ accessToken });
    setRefreshCookie(response, newRefreshToken);
    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
  }
}
