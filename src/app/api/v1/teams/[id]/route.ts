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

    return NextResponse.json(team);
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    throw error;
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const prisma = requirePrisma();
    const result = await requireTrainer(request);
    if (result instanceof NextResponse) return result;
    const { id } = await params;

    const existing = await prisma.team.findFirst({
      where: { id, trainerId: result.sub },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const body = await request.json();

    // GAP-14: Validate logoUrl — must be a data URI or relative path, not an external URL
    if ('logoUrl' in body && body.logoUrl !== null) {
      const url: string = body.logoUrl;
      const isDataUri = url.startsWith('data:image/');
      const isRelativePath = url.startsWith('/');
      if (!isDataUri && !isRelativePath) {
        return NextResponse.json(
          { error: 'Logo must be uploaded via the logo endpoint, not an external URL' },
          { status: 400 },
        );
      }
    }

    const allowed = ['name', 'isActive', 'expiresAt', 'retainUntil', 'fakeDomain', 'logoUrl'] as const;
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        data[key] = body[key] === null ? null
          : key === 'expiresAt' || key === 'retainUntil' ? new Date(body[key])
          : body[key];
      }
    }

    const team = await prisma.team.update({ where: { id }, data });
    return NextResponse.json(team);
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    throw error;
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const prisma = requirePrisma();
    const result = await requireTrainer(request);
    if (result instanceof NextResponse) return result;
    const { id } = await params;

    const existing = await prisma.team.findFirst({
      where: { id, trainerId: result.sub },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { teamId: id } }),
      prisma.team.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    throw error;
  }
}
