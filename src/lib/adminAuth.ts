import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_ACCESS_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ?? process.env.JWT_SECRET ?? 'dev-admin-access-secret-change-me',
);
const ADMIN_REFRESH_SECRET = new TextEncoder().encode(
  (process.env.ADMIN_JWT_SECRET ?? process.env.JWT_SECRET ?? 'dev-admin-refresh-secret-change-me') + '-refresh',
);

function validateSecretsInProduction(): void {
  if (process.env.NODE_ENV === 'production' &&
      !process.env.ADMIN_JWT_SECRET &&
      !process.env.JWT_SECRET) {
    throw new Error('ADMIN_JWT_SECRET or JWT_SECRET must be set in production');
  }
}

export interface AdminTokenPayload extends JWTPayload {
  sub: string; // adminId
  username: string;
  role: 'admin';
}

export async function signAdminAccessToken(adminId: string, username: string): Promise<string> {
  validateSecretsInProduction();
  return new SignJWT({ sub: adminId, username, role: 'admin' } satisfies AdminTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(ADMIN_ACCESS_SECRET);
}

export async function signAdminRefreshToken(adminId: string, username: string): Promise<string> {
  validateSecretsInProduction();
  return new SignJWT({ sub: adminId, username, role: 'admin' } satisfies AdminTokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(ADMIN_REFRESH_SECRET);
}

export async function verifyAdminAccessToken(token: string): Promise<AdminTokenPayload> {
  validateSecretsInProduction();
  const { payload } = await jwtVerify(token, ADMIN_ACCESS_SECRET);
  if (payload.role !== 'admin') {
    throw new Error('Invalid token role');
  }
  return payload as AdminTokenPayload;
}

export async function verifyAdminRefreshToken(token: string): Promise<AdminTokenPayload> {
  validateSecretsInProduction();
  const { payload } = await jwtVerify(token, ADMIN_REFRESH_SECRET);
  if (payload.role !== 'admin') {
    throw new Error('Invalid token role');
  }
  return payload as AdminTokenPayload;
}

/**
 * Require admin authentication. Returns admin payload or a 401 NextResponse.
 */
export async function requireAdmin(
  request: NextRequest,
): Promise<AdminTokenPayload | NextResponse> {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      return await verifyAdminAccessToken(authHeader.slice(7));
    } catch {
      // Access token expired or invalid — fall through
    }
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Set admin refresh token as HttpOnly cookie.
 */
export function setAdminRefreshCookie(response: NextResponse, token: string): void {
  response.cookies.set('adminRefreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/admin/auth',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Clear admin refresh token cookie.
 */
export function clearAdminRefreshCookie(response: NextResponse): void {
  response.cookies.set('adminRefreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/admin/auth',
    maxAge: 0,
  });
}
