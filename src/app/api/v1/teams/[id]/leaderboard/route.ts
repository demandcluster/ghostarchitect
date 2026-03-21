import { NextRequest, NextResponse } from 'next/server';
import { computeLeaderboardSnapshot } from '@/lib/leaderboard';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function GET(_: unknown, { params }: Params) {
  try {
    const prisma = requirePrisma();
    const { id } = await params;

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const snapshot = await computeLeaderboardSnapshot(id);
    return NextResponse.json(snapshot);
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    throw error;
  }
}
