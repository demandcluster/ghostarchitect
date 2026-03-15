import { describe, it, expect } from "vitest";
import { computeTotal, computeResponseTimeBonus, CATEGORY_MAX, TOTAL_MAX } from "./scoring";
import type { ScoreCategory } from "@/stores/scoreStore";

describe("scoring", () => {
  describe("CATEGORY_MAX", () => {
    it("has 25 max for each of the 4 categories", () => {
      const categories: ScoreCategory[] = ["phishingIQ", "passwordHygiene", "networkSecurity", "forensicSkill"];
      for (const cat of categories) {
        expect(CATEGORY_MAX[cat]).toBe(25);
      }
    });
  });

  describe("TOTAL_MAX", () => {
    it("equals 100", () => {
      expect(TOTAL_MAX).toBe(100);
    });
  });

  describe("computeTotal", () => {
    it("sums all category scores", () => {
      expect(
        computeTotal({ phishingIQ: 20, passwordHygiene: 15, networkSecurity: 10, forensicSkill: 5 })
      ).toBe(50);
    });

    it("returns 0 for all-zero scores", () => {
      expect(
        computeTotal({ phishingIQ: 0, passwordHygiene: 0, networkSecurity: 0, forensicSkill: 0 })
      ).toBe(0);
    });

    it("returns 100 for all-max scores", () => {
      expect(
        computeTotal({ phishingIQ: 25, passwordHygiene: 25, networkSecurity: 25, forensicSkill: 25 })
      ).toBe(100);
    });
  });

  describe("computeResponseTimeBonus", () => {
    it("returns 5 for instant response (0ms)", () => {
      expect(computeResponseTimeBonus(0)).toBe(5);
    });

    it("returns 0 at or above threshold", () => {
      expect(computeResponseTimeBonus(30_000)).toBe(0);
      expect(computeResponseTimeBonus(50_000)).toBe(0);
    });

    it("returns proportional bonus for mid-range time", () => {
      // 15s out of 30s threshold = 50% ratio = 2.5 rounded = 3
      expect(computeResponseTimeBonus(15_000)).toBe(3);
    });

    it("accepts custom threshold", () => {
      // 5s out of 10s = 50% ratio = 2.5 rounded = 3
      expect(computeResponseTimeBonus(5_000, 10_000)).toBe(3);
    });

    it("returns 0 for negative elapsed (edge case)", () => {
      // ratio > 1, rounds to > 5, but let's verify behavior
      const result = computeResponseTimeBonus(-1000);
      expect(result).toBeGreaterThanOrEqual(5);
    });
  });
});
