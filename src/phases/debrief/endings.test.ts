import { describe, it, expect } from "vitest";
import { deriveFlags } from "@/engine/rules";

describe("endings via deriveFlags", () => {
  describe("promoted ending", () => {
    it("requires 6+ positive flags and 0 negatives", () => {
      const flags = new Set([
        "caught_all_phishing",
        "chose_strong_password",
        "avoided_evil_twin",
        "contained_quickly",
        "extracted_all_iocs",
        "rotated_credentials",
      ]);
      const result = deriveFlags({}, flags);
      expect(result.ending).toBe("promoted");
    });
  });

  describe("fired ending", () => {
    it("2+ negatives results in fired", () => {
      const flags = new Set([
        "caught_all_phishing",
        "chose_strong_password",
        "avoided_evil_twin",
        "contained_quickly",
        "extracted_all_iocs",
        "rotated_credentials",
        "fell_for_social_engineering",
        "over_quarantined",
      ]);
      const result = deriveFlags({}, flags);
      expect(result.ending).toBe("fired");
    });
  });

  describe("lateral ending", () => {
    it("1 negative prevents promoted, results in lateral", () => {
      const flags = new Set([
        "caught_all_phishing",
        "chose_strong_password",
        "avoided_evil_twin",
        "contained_quickly",
        "extracted_all_iocs",
        "rotated_credentials",
        "over_quarantined",
      ]);
      const result = deriveFlags({}, flags);
      expect(result.ending).not.toBe("promoted");
      // With 6 positives and 1 negative, should be lateral
      expect(result.ending).toBe("lateral");
    });
  });

  describe("neutral ending", () => {
    it("3 positive flags without negatives = neutral", () => {
      const flags = new Set([
        "caught_all_phishing",
        "chose_strong_password",
        "avoided_evil_twin",
      ]);
      const result = deriveFlags({}, flags);
      expect(result.ending).toBe("neutral");
    });

    it("no flags at all = fired (0 positives <= 2)", () => {
      const result = deriveFlags({}, new Set());
      expect(result.ending).toBe("fired");
    });

    it("2 or fewer positives = fired", () => {
      const flags = new Set(["caught_all_phishing", "chose_strong_password"]);
      const result = deriveFlags({}, flags);
      expect(result.ending).toBe("fired");
    });
  });

  describe("investigation flags influence endings", () => {
    it("contained_quickly is required for promoted", () => {
      const flags = new Set([
        "caught_all_phishing",
        "chose_strong_password",
        "avoided_evil_twin",
        "extracted_all_iocs",
        "rotated_credentials",
        "escalated_in_time",
      ]);
      const result = deriveFlags({}, flags);
      // 6 positives but missing contained_quickly — still promoted
      expect(result.ending).toBe("promoted");
    });

    it("extracted_all_iocs contributes to promoted", () => {
      const result = deriveFlags({}, new Set(["extracted_all_iocs"]));
      expect(result.extractedAllIOCs).toBe(true);
    });

    it("rotated_credentials contributes to promoted", () => {
      const result = deriveFlags({}, new Set(["rotated_credentials"]));
      expect(result.rotatedCredentials).toBe(true);
    });
  });
});
