import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken } from '@/lib/csrf';

export async function GET(_request: NextRequest) {
  const token = generateCSRFToken();
  const response = NextResponse.json({ csrfToken: token });

  // Set CSRF token as a cookie
  response.cookies.set('csrfToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 24 * 60 * 60, // 24 hours
  });

  return response;
}
