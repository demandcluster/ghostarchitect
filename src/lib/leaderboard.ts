/**
 * SSE fan-out singleton for real-time leaderboard updates.
 * Module-level Map<teamId, Set<WritableStreamDefaultWriter>>.
 * Single-replica only; add Redis pub/sub for multi-replica.
 */

import { requirePrisma } from '@/lib/prisma';

type SSEWriter = WritableStreamDefaultWriter<Uint8Array>;

const teamConnections = new Map<string, Set<SSEWriter>>();

export function addSSEClient(teamId: string, writer: SSEWriter): void {
  if (!teamConnections.has(teamId)) {
    teamConnections.set(teamId, new Set());
  }
  teamConnections.get(teamId)!.add(writer);
}

export function removeSSEClient(teamId: string, writer: SSEWriter): void {
  const clients = teamConnections.get(teamId);
  if (!clients) return;
  clients.delete(writer);
  if (clients.size === 0) {
    teamConnections.delete(teamId);
  }
}

export async function computeAndBroadcastLeaderboard(teamId: string): Promise<void> {
  const snapshot = await computeLeaderboardSnapshot(teamId);
  const clients = teamConnections.get(teamId);
  if (!clients || clients.size === 0) return;

  const encoder = new TextEncoder();
  const data = encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`);

  const dead: SSEWriter[] = [];
  for (const writer of clients) {
    try {
      await writer.write(data);
    } catch {
      dead.push(writer);
    }
  }
  for (const w of dead) {
    clients.delete(w);
  }
}

export async function computeLeaderboardSnapshot(teamId: string) {
  const db = requirePrisma();
  const [team, sessions] = await Promise.all([
    db.team.findUnique({ where: { id: teamId }, select: { name: true } }),
    db.session.findMany({
      where: { teamId },
      orderBy: [{ totalScore: 'desc' }, { completedAt: 'asc' }],
    }),
  ]);

  const rankings = sessions.map((s: { playerHandle: string | null; totalScore: number | null; completedAt: Date | null; phaseScores: unknown; endingReached: string | null }, i: number) => ({
    rank: i + 1,
    playerHandle: s.playerHandle ?? 'Anonymous',
    totalScore: s.totalScore ?? 0,
    completedAt: s.completedAt?.toISOString() ?? undefined,
    phaseScores: s.phaseScores as Record<string, number>,
    endingReached: s.endingReached ?? undefined,
  }));

  return {
    teamId,
    teamName: team?.name ?? '',
    updatedAt: new Date().toISOString(),
    rankings,
  };
}
