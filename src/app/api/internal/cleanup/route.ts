import { NextRequest, NextResponse } from 'next/server';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';

// GAP-08: Retention enforcement — called daily by Kubernetes CronJob
// Requires x-internal-secret header matching INTERNAL_SECRET env var
export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Internal secret not configured' }, { status: 503 });
  }

  const provided = request.headers.get('x-internal-secret');
  if (!provided || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const prisma = requirePrisma();
    const now = new Date();
    const graceCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // now - 7 days

    // Find teams that have passed their retainUntil date — delete sessions first
    const expiredRetainTeams = await prisma.team.findMany({
      where: { retainUntil: { lt: now } },
      select: { id: true },
    });
    const expiredRetainTeamIds = expiredRetainTeams.map((t) => t.id);

    const deletedSessionsByRetain = expiredRetainTeamIds.length > 0
      ? await prisma.session.deleteMany({ where: { teamId: { in: expiredRetainTeamIds } } })
      : { count: 0 };

    // Delete teams whose expiresAt is past and beyond the 7-day grace period
    const deletedTeams = await prisma.team.deleteMany({
      where: {
        expiresAt: { lt: graceCutoff },
      },
    });

    return NextResponse.json({
      ok: true,
      deletedSessionsByRetentionPolicy: deletedSessionsByRetain.count,
      deletedExpiredTeams: deletedTeams.count,
      ranAt: now.toISOString(),
    });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Retention cleanup error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
