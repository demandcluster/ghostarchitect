import { NextRequest, NextResponse } from 'next/server';
import { addSSEClient, removeSSEClient, computeLeaderboardSnapshot } from '@/lib/leaderboard';
import { requirePrisma, NoDatabaseError } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const prisma = requirePrisma();
    const { id } = await params;

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return new Response(JSON.stringify({ error: 'Team not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream<Uint8Array>();
    const writer = writable.getWriter();

    addSSEClient(id, writer);

    // Send initial snapshot
    const snapshot = await computeLeaderboardSnapshot(id);
    writer.write(encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`)).catch(() => {});

    // Keep-alive ping every 30s
    const keepAlive = setInterval(() => {
      writer.write(encoder.encode(': ping\n\n')).catch(() => {
        clearInterval(keepAlive);
      });
    }, 30_000);

    // Cleanup on client disconnect
    _request.signal.addEventListener('abort', () => {
      clearInterval(keepAlive);
      removeSSEClient(id, writer);
      writer.close().catch(() => {});
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    if (error instanceof NoDatabaseError) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }
    throw error;
  }
}
