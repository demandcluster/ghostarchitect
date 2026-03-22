import { NextRequest, NextResponse } from 'next/server';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) return authResult;

    const prisma = requirePrisma();
    const { id } = await params;

    const trainer = await prisma.trainer.findUnique({
      where: { id },
      select: { id: true, teams: { select: { id: true } } },
    });
    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

    const teamIds = trainer.teams.map((t: { id: string }) => t.id);

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { teamId: { in: teamIds } } }),
      prisma.team.deleteMany({ where: { trainerId: id } }),
      prisma.trainer.delete({ where: { id } }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    console.error('Admin DELETE trainer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
