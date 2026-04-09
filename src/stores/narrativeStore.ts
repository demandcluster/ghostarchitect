import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PersistStorage, StorageValue } from "zustand/middleware";

export interface TimelineEntry {
  id: string;
  timestamp: number;
  phase: string;
  description: string;
  decisionKey?: string;
}

interface NarrativeState {
  decisions: Record<string, string>;
  flags: Set<string>;
  timeline: TimelineEntry[];
  revealedDmIds: string[];
  npcDmIndex: number;

  setDecision: (key: string, value: string) => void;
  addFlag: (flag: string) => void;
  removeFlag: (flag: string) => void;
  hasFlag: (flag: string) => boolean;
  addTimelineEntry: (entry: Omit<TimelineEntry, "timestamp">) => void;
  setRevealedDmIds: (ids: string[]) => void;
  setNpcDmIndex: (index: number) => void;
  reset: () => void;
}

// Custom storage: serialises Set<string> as a plain array so JSON round-trips cleanly.
const narrativeStorage: PersistStorage<NarrativeState> = {
  getItem: (name): StorageValue<NarrativeState> | null => {
    if (typeof window === "undefined") return null;
    const str = localStorage.getItem(name);
    if (!str) return null;
    try {
      const raw = JSON.parse(str) as {
        state?: Record<string, unknown>;
        version?: number;
      };
      const state = raw.state ?? {};
      return {
        state: {
          decisions: (state.decisions as Record<string, string>) ?? {},
          flags: new Set<string>(
            Array.isArray(state.flags) ? (state.flags as string[]) : []
          ),
          timeline: (state.timeline as TimelineEntry[]) ?? [],
          revealedDmIds: (state.revealedDmIds as string[]) ?? [],
          npcDmIndex: (state.npcDmIndex as number) ?? 0,
        } as NarrativeState,
        version: raw.version,
      };
    } catch {
      return null;
    }
  },
  setItem: (name, value: StorageValue<NarrativeState>) => {
    if (typeof window === "undefined") return;
    const toStore = {
      state: {
        ...value.state,
        flags: Array.from(value.state.flags),
      },
      version: value.version,
    };
    localStorage.setItem(name, JSON.stringify(toStore));
  },
  removeItem: (name) => {
    if (typeof window !== "undefined") localStorage.removeItem(name);
  },
};

export const useNarrativeStore = create<NarrativeState>()(
  persist(
    (set, get) => ({
      decisions: {},
      flags: new Set<string>(),
      timeline: [],
      revealedDmIds: [],
      npcDmIndex: 0,

      setDecision: (key, value) =>
        set((state) => ({
          decisions: { ...state.decisions, [key]: value },
        })),

      addFlag: (flag) =>
        set((state) => {
          const next = new Set(state.flags);
          next.add(flag);
          return { flags: next };
        }),

      removeFlag: (flag) =>
        set((state) => {
          const next = new Set(state.flags);
          next.delete(flag);
          return { flags: next };
        }),

      hasFlag: (flag) => get().flags.has(flag),

      addTimelineEntry: (entry) =>
        set((state) => ({
          timeline: [...state.timeline, { ...entry, timestamp: Date.now() }],
        })),

      setRevealedDmIds: (ids) => set({ revealedDmIds: ids }),
      setNpcDmIndex: (index) => set({ npcDmIndex: index }),

      reset: () => set({ decisions: {}, flags: new Set(), timeline: [], revealedDmIds: [], npcDmIndex: 0 }),
    }),
    { name: "ghost-architect:narrative", storage: narrativeStorage }
  )
);
