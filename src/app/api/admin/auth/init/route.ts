import { NextRequest, NextResponse } from 'next/server';
import { initAdminOnStartup } from '@/lib/initAdmin';

export async function POST(_request: NextRequest) {
  try {
    const result = await initAdminOnStartup();

    if (result.success) {
      return NextResponse.json(
        { ok: true, username: result.username || result.admin },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { error: result.error || 'Initialization failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Admin init error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
