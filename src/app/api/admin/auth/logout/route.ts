import { NextResponse } from 'next/server';
import { clearAdminRefreshCookie } from '@/lib/adminAuth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAdminRefreshCookie(response);
  return response;
}
