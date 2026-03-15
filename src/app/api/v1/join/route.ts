import { NextRequest, NextResponse } from 'next/server';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';
import { checkRateLimit, recordFailure, resetFailures, JOIN_RATE_LIMIT } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';

  const limit = checkRateLimit(ip, JOIN_RATE_LIMIT);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfterMs: limit.retryAfterMs },
      { status: 429 },
    );
  }

  try {
    const prisma = requirePrisma();
    const { inviteCode, anonymousId, playerHandle } = await request.json();

    if (!inviteCode || !anonymousId) {
      return NextResponse.json(
        { error: 'inviteCode and anonymousId are required' },
        { status: 400 },
      );
    }

    const team = await prisma.team.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() },
    });

    if (!team || !team.isActive) {
      recordFailure(ip, JOIN_RATE_LIMIT);
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    if (team.expiresAt && team.expiresAt < new Date()) {
      recordFailure(ip, JOIN_RATE_LIMIT);
      return NextResponse.json({ error: 'Invite code has expired' }, { status: 410 });
    }

    resetFailures(ip);

    // Hard handle uniqueness: reject if handle is already taken on this team
    const resolvedHandle: string | null = playerHandle || null;
    if (resolvedHandle) {
      const existing = await prisma.session.findFirst({
        where: { teamId: team.id, playerHandle: resolvedHandle },
      });
      if (existing) {
        return NextResponse.json(
          { error: `Handle "${resolvedHandle}" is already taken on this team. Choose a different name.` },
          { status: 409 },
        );
      }
    }

    const session = await prisma.session.create({
      data: {
        teamId: team.id,
        anonymousId,
        playerHandle: resolvedHandle,
        phaseScores: {},
      },
    });

    return NextResponse.json({
      id: session.id,
      teamId: session.teamId,
      teamName: team.name,
      fakeDomain: team.fakeDomain,
      logoUrl: team.logoUrl ?? null,
      anonymousId: session.anonymousId,
      playerHandle: session.playerHandle,
      startedAt: session.startedAt.toISOString(),
      phaseScores: session.phaseScores,
      totalScore: session.totalScore,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Join error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
