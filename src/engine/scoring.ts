import { ScoreCategory } from "@/stores/scoreStore";

// Nominal maximums for UI scaling only
export const CATEGORY_NOMINAL_MAX: Record<ScoreCategory, number> = {
  phishingIQ: 150,
  passwordHygiene: 150,
  networkSecurity: 150,
  forensicSkill: 150,
};

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
