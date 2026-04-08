/**
 * GameService interface — adapter pattern for local vs. API storage.
 * v1: localStorageAdapter (offline, single player)
 * v2: apiAdapter (backend, team/leaderboard support)
 */

// Stored as JSON in the DB — keys are category names used by the trainer dashboard
// (phishingIQ, passwordHygiene, networkSecurity, forensicSkill) plus any future keys.
export type PhaseScores = Record<string, number>;

export interface SessionData {
  id: string;
  teamId?: string;
  teamName?: string;
  fakeDomain?: string;
  anonymousId: string;
  playerHandle?: string;
  startedAt: string;
  completedAt?: string;
  phaseScores: PhaseScores;
  totalScore?: number;
  endingReached?: string;
}

export interface LeaderboardEntry {
  rank: number;
  playerHandle: string;
  totalScore: number;
  completedAt?: string;
  phaseScores: PhaseScores;
  endingReached?: string;
}

export interface LeaderboardSnapshot {
  teamId: string;
  teamName: string;
  updatedAt: string;
  rankings: LeaderboardEntry[];
}

export interface GameService {
  // Session lifecycle
  createSession(anonymousId: string, playerHandle?: string, teamId?: string): Promise<SessionData>;
  getSession(sessionId: string): Promise<SessionData | null>;
  updateSession(sessionId: string, updates: Partial<Pick<SessionData, 'phaseScores' | 'totalScore' | 'completedAt' | 'endingReached'>>): Promise<SessionData>;

  // Team join (public)
  joinTeam(inviteCode: string, anonymousId: string, playerHandle?: string): Promise<SessionData>;

  // Leaderboard
  getLeaderboard(teamId: string): Promise<LeaderboardSnapshot>;
  subscribeLeaderboard(teamId: string, onUpdate: (snapshot: LeaderboardSnapshot) => void): () => void;
}
