import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, verifyRefreshToken, type TokenPayload } from '@/lib/jwt';

/**
 * Extract and verify trainer identity from the request.
 * Checks Authorization header first, then tries refresh token rotation.
 * Returns the payload or null if unauthenticated.
 */
export async function getTrainerFromRequest(
  request: NextRequest,
): Promise<TokenPayload | null> {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      return await verifyAccessToken(authHeader.slice(7));
    } catch {
      // Access token expired — fall through to refresh
    }
  }

  // Try refresh token
  const refreshToken = request.cookies.get('refreshToken')?.value;
  if (!refreshToken) return null;

  try {
    return await verifyRefreshToken(refreshToken);
  } catch {
    return null;
  }
}

/**
 * Require trainer authentication. Returns trainer payload or a 401 response.
 */
export async function requireTrainer(
  request: NextRequest,
): Promise<TokenPayload | NextResponse> {
  const trainer = await getTrainerFromRequest(request);
  if (!trainer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return trainer;
}

/**
 * Set refresh token as HttpOnly cookie.
 */
export function setRefreshCookie(response: NextResponse, token: string): void {
  response.cookies.set('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Clear refresh token cookie.
 */
export function clearRefreshCookie(response: NextResponse): void {
  response.cookies.set('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: 0,
  });
}
