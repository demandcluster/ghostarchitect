import { NextRequest, NextResponse } from 'next/server';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

/** Public team branding info — no auth required (only exposes name/domain/logo). */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const prisma = requirePrisma();
    const { id } = await params;

    const team = await prisma.team.findUnique({
      where: { id },
      select: { name: true, fakeDomain: true, logoUrl: true },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(team);
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    throw error;
  }
}
