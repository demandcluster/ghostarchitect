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
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const sessions = await prisma.session.findMany({
      where: { teamId: id },
      orderBy: [{ totalScore: 'desc' }, { completedAt: 'asc' }],
    });

    return NextResponse.json(sessions);
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    throw error;
  }
}
