import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';

// GAP-11: Trainer account data export — returns trainer account + teams, no player session data
export async function GET(request: NextRequest) {
  try {
    const prisma = requirePrisma();
    const result = await requireTrainer(request);
    if (result instanceof NextResponse) return result;

    const trainer = await prisma.trainer.findUnique({
      where: { id: result.sub },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        acceptedTermsAt: true,
        teams: {
          select: {
            id: true,
            name: true,
            inviteCode: true,
            fakeDomain: true,
            logoUrl: true,
            createdAt: true,
            expiresAt: true,
            retainUntil: true,
            isActive: true,
          },
        },
      },
    });

    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      trainer,
    });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    throw error;
  }
}
