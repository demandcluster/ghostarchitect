import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/auth';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const prisma = requirePrisma();
    const result = await requireTrainer(request);
    if (result instanceof NextResponse) return result;

    const trainer = await prisma.trainer.findUnique({
      where: { id: result.sub },
      select: { id: true, username: true, role: true, createdAt: true },
    });

    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

    return NextResponse.json(trainer);
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    throw error;
  }
}

// GAP-05: Trainer account deletion
export async function DELETE(request: NextRequest) {
  try {
    const prisma = requirePrisma();
    const result = await requireTrainer(request);
    if (result instanceof NextResponse) return result;

    const trainer = await prisma.trainer.findUnique({
      where: { id: result.sub },
      select: { id: true, teams: { select: { id: true } } },
    });

    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

    const teamIds = trainer.teams.map((t) => t.id);

    await prisma.$transaction([
      // Delete all sessions belonging to all teams owned by this trainer
      prisma.session.deleteMany({ where: { teamId: { in: teamIds } } }),
      // Delete all teams
      prisma.team.deleteMany({ where: { trainerId: trainer.id } }),
      // Delete the trainer
      prisma.trainer.delete({ where: { id: trainer.id } }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Trainer account deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
