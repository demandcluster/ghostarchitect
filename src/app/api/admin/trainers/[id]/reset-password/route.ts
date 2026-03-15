import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) return authResult;

    const prisma = requirePrisma();
    const { id } = await params;
    const { newPassword } = await request.json();

    if (!newPassword || (newPassword as string).length < 8) {
      return NextResponse.json(
        { error: 'newPassword must be at least 8 characters' },
        { status: 400 },
      );
    }

    const trainer = await prisma.trainer.findUnique({ where: { id } });
    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

    const passwordHash = await hash(newPassword, 12);
    await prisma.trainer.update({ where: { id }, data: { passwordHash } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Admin reset-password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
