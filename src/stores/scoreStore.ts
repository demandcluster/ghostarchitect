import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ScoreCategory =
  | "phishingIQ"
  | "passwordHygiene"
  | "networkSecurity"
  | "forensicSkill";

export interface ScoreAction {
  id: string;
  category: ScoreCategory;
  points: number;
  maxPoints: number;
  label: string;
  timestamp: number;
}

interface ScoreState {
  trustScore: number;
  categoryScores: Record<ScoreCategory, number>;
  actions: ScoreAction[];

  addAction: (action: Omit<ScoreAction, "timestamp">) => void;
  setTrustScore: (score: number) => void;
  adjustTrust: (delta: number) => void;
  reset: () => void;
}

const emptyCategoryScores: Record<ScoreCategory, number> = {
  phishingIQ: 0,
  passwordHygiene: 0,
  networkSecurity: 0,
  forensicSkill: 0,
};

export const useScoreStore = create<ScoreState>()(
  persist(
    (set) => ({
      trustScore: 50,
      categoryScores: { ...emptyCategoryScores },
      actions: [],

      addAction: (action) =>
        set((state) => {
          const full: ScoreAction = { ...action, timestamp: Date.now() };
          const newCategoryScores = { ...state.categoryScores };
          newCategoryScores[action.category] = newCategoryScores[action.category] + action.points;
          return {
            actions: [...state.actions, full],
            categoryScores: newCategoryScores,
          };
        }),

      setTrustScore: (score) =>
        set({ trustScore: Math.max(0, Math.min(100, score)) }),

      adjustTrust: (delta) =>
        set((state) => ({
          trustScore: Math.max(0, Math.min(100, state.trustScore + delta)),
        })),

      reset: () =>
        set({
          trustScore: 50,
          categoryScores: { ...emptyCategoryScores },
          actions: [],
        }),
    }),
    { name: "ghost-architect:score" }
  )
);
