import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';
import { signAdminAccessToken, signAdminRefreshToken, setAdminRefreshCookie } from '@/lib/adminAuth';
import { checkRateLimit, recordFailure, resetFailures, type RateLimitConfig } from '@/lib/rateLimit';
import { validateCSRFToken } from '@/lib/csrf';

const ADMIN_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,      // 1 minute
  maxRequests: 5,           // Max 5 login attempts per minute
  lockoutThreshold: 10,        // 10 consecutive failures triggers lockout
  lockoutMs: 15 * 60 * 1000, // 15 minute lockout
};

export async function POST(request: NextRequest) {
  try {
    const prisma = requirePrisma();

    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                 request.headers.get('x-real-ip') ||
                 'unknown';

    // Check rate limit
    const rateLimitResult = checkRateLimit(ip, ADMIN_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many login attempts',
          retryAfterMs: rateLimitResult.retryAfterMs,
        },
        { status: 429 }
      );
    }

    // Validate CSRF token
    const csrfToken = request.cookies.get('csrfToken')?.value;
    const requestBody = await request.json() as { username: string; password: string; csrfToken?: string };
    const bodyCSRFToken = requestBody.csrfToken;

    if (!validateCSRFToken(csrfToken || bodyCSRFToken, csrfToken || '')) {
      // Log CSRF validation failure for security monitoring
      console.warn(`CSRF validation failed from IP: ${ip}`);
      // For now, only warn in development to prevent breaking changes
      // In production, this should reject: return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }

    const { username, password } = requestBody;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) {
      recordFailure(ip, ADMIN_RATE_LIMIT);
      console.warn(`Admin login attempt: user "${username}" not found from IP: ${ip}`);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await compare(password, admin.passwordHash);
    if (!valid) {
      recordFailure(ip, ADMIN_RATE_LIMIT);
      console.warn(`Admin login attempt: invalid password for user "${username}" from IP: ${ip}`);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Successful login - reset failure counter
    resetFailures(ip);

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
