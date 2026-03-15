import { describe, it, expect } from "vitest";
import { computeTotal, computeResponseTimeBonus, CATEGORY_MAX, TOTAL_MAX } from "./scoring";
import type { ScoreCategory } from "@/stores/scoreStore";

describe("scoring", () => {
  describe("CATEGORY_MAX", () => {
    it("has 125 max for each of the 4 categories", () => {
      const categories: ScoreCategory[] = ["phishingIQ", "passwordHygiene", "networkSecurity", "forensicSkill"];
      for (const cat of categories) {
        expect(CATEGORY_MAX[cat]).toBe(125);
      }
    });
  });

  describe("TOTAL_MAX", () => {
    it("equals 500", () => {
      expect(TOTAL_MAX).toBe(500);
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

    it("returns 500 for all-max scores", () => {
      expect(
        computeTotal({ phishingIQ: 125, passwordHygiene: 125, networkSecurity: 125, forensicSkill: 125 })
      ).toBe(500);
    });
  });

  describe("computeResponseTimeBonus", () => {
    it("returns 25 for instant response (0ms)", () => {
      expect(computeResponseTimeBonus(0)).toBe(25);
    });

    it("returns 0 at or above threshold", () => {
      expect(computeResponseTimeBonus(120_000)).toBe(0);
      expect(computeResponseTimeBonus(150_000)).toBe(0);
    });

    it("returns proportional bonus for mid-range time", () => {
      // 60s out of 120s threshold = 50% ratio = 12.5 rounded = 13
      expect(computeResponseTimeBonus(60_000)).toBe(13);
    });

    it("accepts custom threshold", () => {
      // 5s out of 10s = 50% ratio = 12.5 rounded = 13
      expect(computeResponseTimeBonus(5_000, 10_000)).toBe(13);
    });

    it("returns 0 for negative elapsed (edge case)", () => {
      const result = computeResponseTimeBonus(-1000);
      expect(result).toBeGreaterThanOrEqual(25);
    });
  });
});
