import { NextRequest, NextResponse } from 'next/server';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';
import { computeAndBroadcastLeaderboard } from '@/lib/leaderboard';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const prisma = requirePrisma();
    const { id } = await params;

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // GAP-06: Ownership check — caller must prove ownership via header or query param
    const callerAnonId =
      request.headers.get('x-anonymous-id') ??
      request.nextUrl.searchParams.get('anonymousId');

    if (!callerAnonId || callerAnonId !== session.anonymousId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // GAP-12: Do not echo anonymousId back in response
    return NextResponse.json({
      id: session.id,
      teamId: session.teamId,
      playerHandle: session.playerHandle,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
      phaseScores: session.phaseScores,
      totalScore: session.totalScore,
      endingReached: session.endingReached,
    });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    throw error;
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const prisma = requirePrisma();
    const { id } = await params;
    const body = await request.json();
    const { anonymousId, phaseScores, totalScore, completedAt, endingReached } = body;

    // Scope by anonymousId for player security
    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (existing.anonymousId !== anonymousId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data: Record<string, unknown> = {};

    if (phaseScores) {
      // Atomic partial merge of phaseScores jsonb
      const merged = { ...(existing.phaseScores as Record<string, unknown>), ...phaseScores };
      data.phaseScores = merged;
    }

    if (totalScore !== undefined) data.totalScore = totalScore;
    if (completedAt) data.completedAt = new Date(completedAt);
    if (endingReached) data.endingReached = endingReached;

    const session = await prisma.session.update({
      where: { id },
      data: data as never,
    });

    // Trigger leaderboard fan-out if session belongs to a team
    if (session.teamId) {
      computeAndBroadcastLeaderboard(session.teamId).catch(console.error);
    }

    // GAP-12: Do not echo anonymousId back in response
    return NextResponse.json({
      id: session.id,
      teamId: session.teamId,
      playerHandle: session.playerHandle,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString(),
      phaseScores: session.phaseScores,
      totalScore: session.totalScore,
      endingReached: session.endingReached,
    });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Update session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GAP-04: Player erasure endpoint
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const prisma = requirePrisma();
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const { anonymousId } = body;

    if (!anonymousId) {
      return NextResponse.json({ error: 'anonymousId is required' }, { status: 400 });
    }

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.anonymousId !== anonymousId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.session.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Delete session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
