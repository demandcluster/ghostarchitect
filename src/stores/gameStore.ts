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
  anonymousId: string | null;
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
  setAnonymousId: (id: string | null) => void;
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

// localStorage helper — centralises the SSR guard and key prefix
const ls = {
  get: (key: string): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem(`ghost-architect:${key}`) : null,
  set: (key: string, value: string): void => {
    if (typeof window !== 'undefined') localStorage.setItem(`ghost-architect:${key}`, value);
  },
  remove: (key: string): void => {
    if (typeof window !== 'undefined') localStorage.removeItem(`ghost-architect:${key}`);
  },
};

const generateSessionId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
};

// Clean defaults used by reset() — no localStorage reads
const DEFAULTS = {
  phase: "onboarding" as Phase,
  visualMode: "corporate" as VisualMode,
  sessionId: null as string | null,
  anonymousId: null as string | null,
  isTransitioning: false,
  teamId: null as string | null,
  playerHandle: null as string | null,
  fakeDomain: "nexuscorp.com",
  teamName: "NexusCorp",
  logoUrl: null as string | null,
  contentLocale: "en",
};

export const useGameStore = create<GameState>((set) => ({
  // Always start from clean DEFAULTS so server and client initial renders match.
  // Call hydrateGameStore() inside a useEffect to restore localStorage values
  // after the first render — avoids React hydration mismatches.
  ...DEFAULTS,

  setPhase: (phase) => set({ phase }),
  setVisualMode: (mode) => set({ visualMode: mode }),
  setSessionId: (id) => {
    ls.set('sessionId', id);
    set({ sessionId: id });
  },
  setAnonymousId: (id) => {
    if (id) ls.set('anonymousId', id);
    else ls.remove('anonymousId');
    set({ anonymousId: id });
  },
  initSession: () => {
    const id = generateSessionId();
    ls.set('sessionId', id);
    set({ sessionId: id });
  },
  setIsTransitioning: (val) => set({ isTransitioning: val }),
  setTeamId: (id) => {
    if (id) ls.set('teamId', id);
    else ls.remove('teamId');
    set({ teamId: id });
  },
  setPlayerHandle: (handle) => {
    if (handle) ls.set('playerHandle', handle);
    else ls.remove('playerHandle');
    set({ playerHandle: handle });
  },
  setFakeDomain: (domain) => {
    ls.set('fakeDomain', domain);
    set({ fakeDomain: domain });
  },
  setTeamName: (name) => {
    ls.set('teamName', name);
    set({ teamName: name });
  },
  setLogoUrl: (url) => {
    if (url) ls.set('logoUrl', url);
    else ls.remove('logoUrl');
    set({ logoUrl: url });
  },
  setContentLocale: (locale) => set({ contentLocale: locale }),
  reset: () => {
    ['playerHandle', 'teamId', 'sessionId', 'anonymousId', 'fakeDomain', 'teamName', 'logoUrl']
      .forEach((k) => ls.remove(k));
    set(DEFAULTS);
  },
}));

/** Call once inside a useEffect at the app root to restore persisted state. */
export function hydrateGameStore() {
  useGameStore.setState({
    sessionId:    ls.get('sessionId'),
    anonymousId:  ls.get('anonymousId'),
    teamId:       ls.get('teamId'),
    playerHandle: ls.get('playerHandle'),
    fakeDomain:   ls.get('fakeDomain') || "nexuscorp.com",
    teamName:     ls.get('teamName')   || "NexusCorp",
    logoUrl:      ls.get('logoUrl'),
  });
}
