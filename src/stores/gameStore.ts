import { create } from "zustand";

export type Phase =
  | "onboarding"
  | "breach"
  | "investigation"
  | "debrief";

export type VisualMode = "corporate" | "breach";

interface GameState {
  phase: Phase;
  visualMode: VisualMode;
  sessionId: string | null;
  isTransitioning: boolean;
  teamId: string | null;
  playerHandle: string | null;
  fakeDomain: string;
  teamName: string;
  logoUrl: string | null;
  contentLocale: string;

  setPhase: (phase: Phase) => void;
  setVisualMode: (mode: VisualMode) => void;
  setSessionId: (id: string) => void;
  initSession: () => void;
  setIsTransitioning: (val: boolean) => void;
  setTeamId: (id: string | null) => void;
  setPlayerHandle: (handle: string | null) => void;
  setFakeDomain: (domain: string) => void;
  setTeamName: (name: string) => void;
  setLogoUrl: (url: string | null) => void;
  setContentLocale: (locale: string) => void;
  reset: () => void;
}

const generateSessionId = () => crypto.randomUUID();

const getLocalStorageItem = (key: string): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem(key) : null;

const savedHandle = getLocalStorageItem('ghost-architect:playerHandle');
const savedTeamId = getLocalStorageItem('ghost-architect:teamId');
const savedSessionId = getLocalStorageItem('ghost-architect:sessionId');
const savedFakeDomain = getLocalStorageItem('ghost-architect:fakeDomain');
const savedTeamName = getLocalStorageItem('ghost-architect:teamName');
const savedLogoUrl = getLocalStorageItem('ghost-architect:logoUrl');

const initialState = {
  phase: "onboarding" as Phase,
  visualMode: "corporate" as VisualMode,
  // sessionId starts null; only set when player explicitly starts a session.
  // The returning-player flow (savedSessionId) is the only exception: we
  // restore the previously accepted session rather than silently generating
  // a new one before the player has acknowledged the privacy notice.
  sessionId: savedSessionId || null,
  isTransitioning: false,
  teamId: (savedTeamId || null) as string | null,
  playerHandle: (savedHandle || null) as string | null,
  fakeDomain: savedFakeDomain || "nexuscorp.com",
  teamName: savedTeamName || "NexusCorp",
  logoUrl: savedLogoUrl || null,
  contentLocale: 'en',
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setVisualMode: (mode) => set({ visualMode: mode }),
  setSessionId: (id) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ghost-architect:sessionId', id);
    }
    set({ sessionId: id });
  },
  initSession: () => {
    const id = generateSessionId();
    if (typeof window !== 'undefined') {
      localStorage.setItem('ghost-architect:sessionId', id);
    }
    set({ sessionId: id });
  },
  setIsTransitioning: (val) => set({ isTransitioning: val }),
  setTeamId: (id) => {
    if (typeof window !== 'undefined') {
      if (id !== null) localStorage.setItem('ghost-architect:teamId', id);
      else localStorage.removeItem('ghost-architect:teamId');
    }
    set({ teamId: id });
  },
  setPlayerHandle: (handle) => {
    if (typeof window !== 'undefined') {
      if (handle !== null) localStorage.setItem('ghost-architect:playerHandle', handle);
      else localStorage.removeItem('ghost-architect:playerHandle');
    }
    set({ playerHandle: handle });
  },
  setFakeDomain: (domain) => {
    if (typeof window !== 'undefined') localStorage.setItem('ghost-architect:fakeDomain', domain);
    set({ fakeDomain: domain });
  },
  setTeamName: (name) => {
    if (typeof window !== 'undefined') localStorage.setItem('ghost-architect:teamName', name);
    set({ teamName: name });
  },
  setLogoUrl: (url) => {
    if (typeof window !== 'undefined') {
      if (url) localStorage.setItem('ghost-architect:logoUrl', url);
      else localStorage.removeItem('ghost-architect:logoUrl');
    }
    set({ logoUrl: url });
  },
  setContentLocale: (locale) => set({ contentLocale: locale }),
  reset: () => {
    if (typeof window !== 'undefined') {
      ['playerHandle', 'teamId', 'sessionId', 'fakeDomain', 'teamName', 'logoUrl']
        .forEach((k) => localStorage.removeItem(`ghost-architect:${k}`));
    }
    set({ ...initialState, sessionId: null, teamId: null, playerHandle: null });
  },
}));
