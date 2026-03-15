import { create } from "zustand";

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

  setDecision: (key: string, value: string) => void;
  addFlag: (flag: string) => void;
  removeFlag: (flag: string) => void;
  hasFlag: (flag: string) => boolean;
  addTimelineEntry: (entry: Omit<TimelineEntry, "timestamp">) => void;
  reset: () => void;
}

export const useNarrativeStore = create<NarrativeState>((set, get) => ({
  decisions: {},
  flags: new Set<string>(),
  timeline: [],

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

  reset: () => set({ decisions: {}, flags: new Set(), timeline: [] }),
}));
