import { ScoreCategory } from "@/stores/scoreStore";

export const CATEGORY_MAX: Record<ScoreCategory, number> = {
  phishingIQ: 125,
  passwordHygiene: 125,
  networkSecurity: 125,
  forensicSkill: 125,
};

export const TOTAL_MAX = 500;

export function computeTotal(
  categoryScores: Record<ScoreCategory, number>
): number {
  return Object.values(categoryScores).reduce((sum, v) => sum + v, 0);
}

export function computeResponseTimeBonus(
  elapsedMs: number,
  thresholdMs: number = 120_000
): number {
  if (elapsedMs >= thresholdMs) return 0;
  const ratio = 1 - elapsedMs / thresholdMs;
  return Math.round(ratio * 25);
}
