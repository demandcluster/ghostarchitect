import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';

type Params = { params: Promise<{ id: string; sid: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const prisma = requirePrisma();
    const result = await requireTrainer(request);
    if (result instanceof NextResponse) return result;
    const { id, sid } = await params;

    const team = await prisma.team.findFirst({
      where: { id, trainerId: result.sub },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const session = await prisma.session.findFirst({
      where: { id: sid, teamId: id },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    throw error;
  }
}
