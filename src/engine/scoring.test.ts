import { describe, it, expect } from "vitest";
import { computeTotal, computeResponseTimeBonus, CATEGORY_NOMINAL_MAX } from "./scoring";
import type { ScoreCategory } from "@/stores/scoreStore";

describe("scoring", () => {
  describe("CATEGORY_NOMINAL_MAX", () => {
    it("has 150 nominal max for each of the 4 categories", () => {
      const categories: ScoreCategory[] = ["phishingIQ", "passwordHygiene", "networkSecurity", "forensicSkill"];
      for (const cat of categories) {
        expect(CATEGORY_NOMINAL_MAX[cat]).toBe(150);
      }
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
  });

  describe("computeResponseTimeBonus", () => {
    it("returns max bonus (25) for 0ms", () => {
      expect(computeResponseTimeBonus(0)).toBe(25);
    });

    it("returns half bonus (~13) for 60s", () => {
      expect(computeResponseTimeBonus(60_000)).toBe(13);
    });

    it("returns 0 for 120s or more", () => {
      expect(computeResponseTimeBonus(120_000)).toBe(0);
      expect(computeResponseTimeBonus(300_000)).toBe(0);
    });
  });
});
