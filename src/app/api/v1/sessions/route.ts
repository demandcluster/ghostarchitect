import { NextRequest, NextResponse } from 'next/server';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';
import { computeAndBroadcastLeaderboard } from '@/lib/leaderboard';

// GAP-07: Sanitise deviceInfo — truncate to 50 chars, discard full UA strings
function sanitiseDeviceInfo(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  // Discard anything that looks like a full User-Agent string
  if (raw.includes('Mozilla/')) return null;
  return raw.slice(0, 50);
}

export async function POST(request: NextRequest) {
  try {
    const prisma = requirePrisma();
    const { anonymousId, playerHandle, teamId, deviceInfo } = await request.json();

    if (!anonymousId) {
      return NextResponse.json({ error: 'anonymousId is required' }, { status: 400 });
    }

    const data: Record<string, unknown> = {
      anonymousId,
      playerHandle: playerHandle || null,
      phaseScores: {},
      deviceInfo: sanitiseDeviceInfo(deviceInfo),
    };

    if (teamId) {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || !team.isActive) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      data.teamId = teamId;
    }

    const session = await prisma.session.create({ data: data as never });

    // Push leaderboard update so live dashboard shows the new player immediately
    if (session.teamId) {
      computeAndBroadcastLeaderboard(session.teamId).catch(() => {});
    }

    return NextResponse.json({
      id: session.id,
      teamId: session.teamId,
      playerHandle: session.playerHandle,
      startedAt: session.startedAt.toISOString(),
      phaseScores: session.phaseScores,
      totalScore: session.totalScore,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Create session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
