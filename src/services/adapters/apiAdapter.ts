/**
 * apiAdapter — v2 GameService implementation backed by Next.js API routes.
 * Stub: all methods throw until backend routes are live.
 */

import type { GameService, SessionData, LeaderboardSnapshot } from '@/services/gameService';

const API_BASE = '/api/v1';

export const apiAdapter: GameService = {
  async createSession(
    anonymousId: string,
    playerHandle?: string,
    teamId?: string,
  ): Promise<SessionData> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonymousId, playerHandle, teamId }),
    });
    if (!res.ok) throw new Error(`createSession failed: ${res.status}`);
    return res.json();
  },

  async getSession(sessionId: string): Promise<SessionData | null> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`getSession failed: ${res.status}`);
    return res.json();
  },

  async updateSession(sessionId, updates): Promise<SessionData> {
    const anonymousId =
      typeof window !== 'undefined'
        ? localStorage.getItem('ghost-architect:anonymousId')
        : null;
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, anonymousId }),
    });
    if (!res.ok) throw new Error(`updateSession failed: ${res.status}`);
    return res.json();
  },

  async joinTeam(
    inviteCode: string,
    anonymousId: string,
    playerHandle?: string,
  ): Promise<SessionData> {
    const res = await fetch(`${API_BASE}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode, anonymousId, playerHandle }),
    });
    if (!res.ok) throw new Error(`joinTeam failed: ${res.status}`);
    return res.json();
  },

  async getLeaderboard(teamId: string): Promise<LeaderboardSnapshot> {
    const res = await fetch(`${API_BASE}/teams/${teamId}/leaderboard`);
    if (!res.ok) throw new Error(`getLeaderboard failed: ${res.status}`);
    return res.json();
  },

  subscribeLeaderboard(
    teamId: string,
    onUpdate: (snapshot: LeaderboardSnapshot) => void,
  ): () => void {
    const es = new EventSource(`${API_BASE}/teams/${teamId}/leaderboard/stream`);
    es.onmessage = (event) => {
      onUpdate(JSON.parse(event.data) as LeaderboardSnapshot);
    };
    es.onerror = () => {
      // EventSource auto-reconnects on transient errors
    };
    return () => es.close();
  },
};
