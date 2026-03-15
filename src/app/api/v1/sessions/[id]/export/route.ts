import { NextRequest, NextResponse } from 'next/server';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

// GAP-11: Player data export — returns own session data, excludes anonymousId and teamId
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const prisma = requirePrisma();
    const { id } = await params;

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Ownership check — caller must supply matching x-anonymous-id header
    const callerAnonId = request.headers.get('x-anonymous-id');
    if (!callerAnonId || callerAnonId !== session.anonymousId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      session: {
        id: session.id,
        playerHandle: session.playerHandle,
        phaseScores: session.phaseScores,
        totalScore: session.totalScore,
        endingReached: session.endingReached,
        startedAt: session.startedAt.toISOString(),
        completedAt: session.completedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    throw error;
  }
}
