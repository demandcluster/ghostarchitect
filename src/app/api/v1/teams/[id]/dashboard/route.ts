import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const prisma = requirePrisma();
    const result = await requireTrainer(request);
    if (result instanceof NextResponse) return result;
    const { id } = await params;

    const team = await prisma.team.findFirst({
      where: { id, trainerId: result.sub },
      include: {
        sessions: {
          orderBy: [{ totalScore: 'desc' }, { completedAt: 'asc' }],
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const completedCount = team.sessions.filter((s) => s.completedAt).length;
    const avgScore =
      completedCount > 0
        ? Math.round(
            team.sessions
              .filter((s) => s.totalScore != null)
              .reduce((sum, s) => sum + (s.totalScore ?? 0), 0) / completedCount,
          )
        : 0;

    return NextResponse.json({
      team: { id: team.id, name: team.name, inviteCode: team.inviteCode, isActive: team.isActive },
      stats: {
        totalSessions: team.sessions.length,
        completedSessions: completedCount,
        averageScore: avgScore,
      },
      sessions: team.sessions.map((s) => ({
        id: s.id,
        playerHandle: s.playerHandle,
        totalScore: s.totalScore,
        completedAt: s.completedAt,
        phaseScores: s.phaseScores,
        endingReached: s.endingReached,
        deviceInfo: s.deviceInfo,
      })),
    });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    throw error;
  }
}
