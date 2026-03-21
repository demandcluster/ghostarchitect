import { describe, it, expect } from "vitest";
import { deriveFlags } from "./rules";

describe("deriveFlags", () => {
  const emptyDecisions: Record<string, string> = {};

  function makeFlags(...names: string[]): Set<string> {
    return new Set(names);
  }

  describe("individual flag mapping", () => {
    it("maps caught_all_phishing flag", () => {
      const result = deriveFlags(emptyDecisions, makeFlags("caught_all_phishing"));
      expect(result.caughtAllPhishing).toBe(true);
    });

    it("maps fell_for_social_engineering flag", () => {
      const result = deriveFlags(emptyDecisions, makeFlags("fell_for_social_engineering"));
      expect(result.fellForSocialEngineering).toBe(true);
    });

    it("maps chose_strong_password flag", () => {
      const result = deriveFlags(emptyDecisions, makeFlags("chose_strong_password"));
      expect(result.choseStrongPassword).toBe(true);
    });

    it("maps avoided_evil_twin flag", () => {
      const result = deriveFlags(emptyDecisions, makeFlags("avoided_evil_twin"));
      expect(result.avoidedEvilTwin).toBe(true);
    });

    it("maps contained_quickly flag", () => {
      const result = deriveFlags(emptyDecisions, makeFlags("contained_quickly"));
      expect(result.containedQuickly).toBe(true);
    });

    it("maps extracted_all_iocs flag", () => {
      const result = deriveFlags(emptyDecisions, makeFlags("extracted_all_iocs"));
      expect(result.extractedAllIOCs).toBe(true);
    });

    it("maps rotated_credentials flag", () => {
      const result = deriveFlags(emptyDecisions, makeFlags("rotated_credentials"));
      expect(result.rotatedCredentials).toBe(true);
    });

    it("maps escalated_in_time flag", () => {
      const result = deriveFlags(emptyDecisions, makeFlags("escalated_in_time"));
      expect(result.escalatedInTime).toBe(true);
    });

    it("maps over_quarantined flag", () => {
      const result = deriveFlags(emptyDecisions, makeFlags("over_quarantined"));
      expect(result.overQuarantined).toBe(true);
    });

    it("returns all false for empty flags", () => {
      const result = deriveFlags(emptyDecisions, new Set());
      expect(result.caughtAllPhishing).toBe(false);
      expect(result.fellForSocialEngineering).toBe(false);
      expect(result.choseStrongPassword).toBe(false);
      expect(result.avoidedEvilTwin).toBe(false);
      expect(result.containedQuickly).toBe(false);
      expect(result.extractedAllIOCs).toBe(false);
      expect(result.rotatedCredentials).toBe(false);
      expect(result.escalatedInTime).toBe(false);
      expect(result.overQuarantined).toBe(false);
    });
  });

  describe("ending determination", () => {
    it("returns 'promoted' when 6+ positives and 0 negatives", () => {
      const result = deriveFlags(
        emptyDecisions,
        makeFlags(
          "caught_all_phishing",
          "chose_strong_password",
          "avoided_evil_twin",
          "contained_quickly",
          "extracted_all_iocs",
          "rotated_credentials"
        )
      );
      expect(result.ending).toBe("promoted");
    });

    it("returns 'promoted' with all 7 positives and 0 negatives", () => {
      const result = deriveFlags(
        emptyDecisions,
        makeFlags(
          "caught_all_phishing",
          "chose_strong_password",
          "avoided_evil_twin",
          "contained_quickly",
          "extracted_all_iocs",
          "rotated_credentials",
          "escalated_in_time"
        )
      );
      expect(result.ending).toBe("promoted");
    });

    it("does NOT return 'promoted' if any negative is present even with 6+ positives", () => {
      const result = deriveFlags(
        emptyDecisions,
        makeFlags(
          "caught_all_phishing",
          "chose_strong_password",
          "avoided_evil_twin",
          "contained_quickly",
          "extracted_all_iocs",
          "rotated_credentials",
          "fell_for_social_engineering"
        )
      );
      expect(result.ending).not.toBe("promoted");
    });

    it("returns 'fired' when positives <= 2", () => {
      const result = deriveFlags(
        emptyDecisions,
        makeFlags("caught_all_phishing", "chose_strong_password")
      );
      expect(result.ending).toBe("fired");
    });

    it("returns 'fired' when negatives >= 2", () => {
      const result = deriveFlags(
        emptyDecisions,
        makeFlags(
          "caught_all_phishing",
          "chose_strong_password",
          "avoided_evil_twin",
          "contained_quickly",
          "fell_for_social_engineering",
          "over_quarantined"
        )
      );
      expect(result.ending).toBe("fired");
    });

    it("returns 'fired' with 0 positives and 0 negatives", () => {
      const result = deriveFlags(emptyDecisions, new Set());
      expect(result.ending).toBe("fired");
    });

    it("returns 'lateral' when positives >= 4 (but < 6 or has negatives)", () => {
      const result = deriveFlags(
        emptyDecisions,
        makeFlags(
          "caught_all_phishing",
          "chose_strong_password",
          "avoided_evil_twin",
          "contained_quickly"
        )
      );
      expect(result.ending).toBe("lateral");
    });

    it("returns 'lateral' with 5 positives and 1 negative", () => {
      const result = deriveFlags(
        emptyDecisions,
        makeFlags(
          "caught_all_phishing",
          "chose_strong_password",
          "avoided_evil_twin",
          "contained_quickly",
          "extracted_all_iocs",
          "fell_for_social_engineering"
        )
      );
      expect(result.ending).toBe("lateral");
    });

    it("returns 'neutral' when positives == 3 and negatives < 2", () => {
      const result = deriveFlags(
        emptyDecisions,
        makeFlags(
          "caught_all_phishing",
          "chose_strong_password",
          "avoided_evil_twin"
        )
      );
      expect(result.ending).toBe("neutral");
    });
  });

  describe("edge cases", () => {
    it("ignores unknown flags in the set", () => {
      const result = deriveFlags(emptyDecisions, makeFlags("unknown_flag", "another_flag"));
      expect(result.ending).toBe("fired");
      expect(result.caughtAllPhishing).toBe(false);
    });

    it("handles decisions parameter (unused currently but accepted)", () => {
      const result = deriveFlags(
        { mfa_choice: "authenticator", wifi_choice: "corporate" },
        makeFlags("caught_all_phishing", "chose_strong_password", "avoided_evil_twin")
      );
      expect(result.ending).toBe("neutral");
    });
  });
});
