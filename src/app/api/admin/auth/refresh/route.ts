import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminRefreshToken,
  signAdminAccessToken,
  signAdminRefreshToken,
  setAdminRefreshCookie,
} from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('adminRefreshToken')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  try {
    const payload = await verifyAdminRefreshToken(refreshToken);
    const accessToken = await signAdminAccessToken(payload.sub as string, payload.username);
    const newRefreshToken = await signAdminRefreshToken(payload.sub as string, payload.username);

    const response = NextResponse.json({ accessToken });
    setAdminRefreshCookie(response, newRefreshToken);
    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
  }
}
