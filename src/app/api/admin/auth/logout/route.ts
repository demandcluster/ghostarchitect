import { NextRequest, NextResponse } from 'next/server';
import { clearAdminRefreshCookie } from '@/lib/adminAuth';

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  clearAdminRefreshCookie(response);
  return response;
}
