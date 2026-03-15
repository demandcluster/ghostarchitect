import type {
  GameService,
  SessionData,
  LeaderboardSnapshot,
} from "@/services/gameService";

const STORAGE_PREFIX = "ghost-architect";
const SCHEMA_VERSION = 1;
const ANON_ID_KEY = `${STORAGE_PREFIX}:anonymousId`;

function sessionKey(id: string) {
  return `${STORAGE_PREFIX}:session:${id}`;
}

function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

export const localStorageAdapter: GameService = {
  async createSession(
    anonymousId: string,
    playerHandle?: string,
  ): Promise<SessionData> {
    const session: SessionData = {
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      anonymousId: anonymousId || getOrCreateAnonymousId(),
      playerHandle,
      startedAt: new Date().toISOString(),
      phaseScores: {},
      totalScore: 0,
    };

    const wrapped = { schemaVersion: SCHEMA_VERSION, data: session };
    localStorage.setItem(sessionKey(session.id), JSON.stringify(wrapped));

    // Track current session id
    localStorage.setItem(`${STORAGE_PREFIX}:currentSessionId`, session.id);

    return session;
  },

  async getSession(sessionId: string): Promise<SessionData | null> {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(sessionKey(sessionId));
    if (!raw) return null;
    // Let SyntaxError propagate for truly corrupt entries
    const parsed = JSON.parse(raw) as { schemaVersion: number; data: SessionData };
    // Future: migrate if parsed.schemaVersion < SCHEMA_VERSION
    return parsed.data ?? null;
  },

  async updateSession(sessionId, updates): Promise<SessionData> {
    const existing = await this.getSession(sessionId);
    if (!existing) throw new Error(`Session ${sessionId} not found`);
    const updated = { ...existing, ...updates };
    const wrapped = { schemaVersion: SCHEMA_VERSION, data: updated };
    localStorage.setItem(sessionKey(sessionId), JSON.stringify(wrapped));
    return updated;
  },

  async joinTeam(
    _inviteCode: string,
    anonymousId: string,
    playerHandle?: string,
  ): Promise<SessionData> {
    // In offline mode there is no real team, but we still persist the handle
    // so that getSession() can return playerHandle on restore.
    const session = await this.createSession(anonymousId, playerHandle);
    return session;
  },

  async getLeaderboard(): Promise<LeaderboardSnapshot> {
    throw new Error(
      "getLeaderboard is not supported in offline mode. Enable backend."
    );
  },

  subscribeLeaderboard(): () => void {
    throw new Error(
      "subscribeLeaderboard is not supported in offline mode. Enable backend."
    );
  },
};
