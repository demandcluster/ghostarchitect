import { describe, it, expect, beforeEach } from "vitest";
import { SOCIAL_ENGINEERING_DM } from "@/content/dmScripts";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { deriveFlags } from "@/engine/rules";
import type { DMChoice } from "@/content/types";

/** Simulates choosing a DM response — applies scoreEffect, trustDelta, and flag */
function simulateDMChoice(choice: DMChoice) {
  const store = useScoreStore.getState();
  const narrative = useNarrativeStore.getState();

  store.adjustTrust(choice.trustDelta);

  if (choice.scoreEffect) {
    store.addAction({
      id: `dm-${choice.id}`,
      category: choice.scoreEffect.category,
      points: choice.scoreEffect.points,
      maxPoints: choice.scoreEffect.maxPoints,
    label: `DM choice: ${choice.label}`,
    });
  }

  if (choice.flag) {
    narrative.addFlag(choice.flag);
  }
}

describe("socialEngineeringDM", () => {
  beforeEach(() => {
    useScoreStore.getState().reset();
    useNarrativeStore.getState().reset();
  });

  describe("DM script content", () => {
    it("has the social engineering DM sequence", () => {
      expect(SOCIAL_ENGINEERING_DM.length).toBeGreaterThanOrEqual(2);
    });

    it("second message has choices", () => {
      const choiceMsg = SOCIAL_ENGINEERING_DM.find((m) => m.choices);
      expect(choiceMsg).toBeDefined();
      expect(choiceMsg!.choices!.length).toBeGreaterThanOrEqual(2);
    });

    it("has exactly one incorrect choice (share credentials)", () => {
      const choiceMsg = SOCIAL_ENGINEERING_DM.find((m) => m.choices)!;
      const incorrect = choiceMsg.choices!.filter((c) => !c.isCorrect);
      expect(incorrect).toHaveLength(1);
    });

    it("has correct choices that refuse to share credentials", () => {
      const choiceMsg = SOCIAL_ENGINEERING_DM.find((m) => m.choices)!;
      const correct = choiceMsg.choices!.filter((c) => c.isCorrect);
      expect(correct.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("falling for social engineering (sharing credentials)", () => {
    it("sets fell_for_social_engineering flag", () => {
      const choiceMsg = SOCIAL_ENGINEERING_DM.find((m) =>
        m.choices?.some((c) => c.flag === "fell_for_social_engineering")
      )!;
      const badChoice = choiceMsg.choices!.find((c) => !c.isCorrect)!;

      simulateDMChoice(badChoice);

      expect(useNarrativeStore.getState().hasFlag("fell_for_social_engineering")).toBe(true);
    });

    it("penalises trust score", () => {
      const initialTrust = useScoreStore.getState().trustScore;
      const choiceMsg = SOCIAL_ENGINEERING_DM.find((m) => m.choices)!;
      const badChoice = choiceMsg.choices!.find((c) => !c.isCorrect)!;

      simulateDMChoice(badChoice);

      expect(useScoreStore.getState().trustScore).toBeLessThan(initialTrust);
    });

    it("scores 0 phishingIQ points", () => {
      const choiceMsg = SOCIAL_ENGINEERING_DM.find((m) => m.choices)!;
      const badChoice = choiceMsg.choices!.find((c) => !c.isCorrect)!;

      simulateDMChoice(badChoice);

      expect(useScoreStore.getState().categoryScores.phishingIQ).toBe(0);
    });
  });

  describe("refusing to share credentials (correct choice)", () => {
    it("does not set fell_for_social_engineering flag", () => {
      const choiceMsg = SOCIAL_ENGINEERING_DM.find((m) => m.choices)!;
      const goodChoice = choiceMsg.choices!.find((c) => c.isCorrect)!;

      simulateDMChoice(goodChoice);

      expect(useNarrativeStore.getState().hasFlag("fell_for_social_engineering")).toBe(false);
    });

    it("preserves or increases trust score", () => {
      const initialTrust = useScoreStore.getState().trustScore;
      const choiceMsg = SOCIAL_ENGINEERING_DM.find((m) => m.choices)!;
      const goodChoice = choiceMsg.choices!.find((c) => c.isCorrect)!;

      simulateDMChoice(goodChoice);

      expect(useScoreStore.getState().trustScore).toBeGreaterThanOrEqual(initialTrust);
    });

    it("scores phishingIQ points", () => {
      const choiceMsg = SOCIAL_ENGINEERING_DM.find((m) => m.choices)!;
      const goodChoice = choiceMsg.choices!.find((c) => c.isCorrect)!;

      simulateDMChoice(goodChoice);

      expect(useScoreStore.getState().categoryScores.phishingIQ).toBeGreaterThan(0);
    });
  });

  describe("deriveFlags consequences from social engineering", () => {
    it("fell_for_social_engineering counts as negative in ending", () => {
      const flags = new Set([
        "caught_all_phishing",
        "chose_strong_password",
        "avoided_evil_twin",
        "contained_quickly",
        "extracted_all_iocs",
        "rotated_credentials",
        "fell_for_social_engineering",
      ]);
      const result = deriveFlags({}, flags);
      expect(result.fellForSocialEngineering).toBe(true);
      // 6 positives + 1 negative = cannot get promoted
      expect(result.ending).not.toBe("promoted");
    });

    it("without fell_for_social_engineering, 6+ positives = promoted", () => {
      const flags = new Set([
        "caught_all_phishing",
        "chose_strong_password",
        "avoided_evil_twin",
        "contained_quickly",
        "extracted_all_iocs",
        "rotated_credentials",
      ]);
      const result = deriveFlags({}, flags);
      expect(result.fellForSocialEngineering).toBe(false);
      expect(result.ending).toBe("promoted");
    });

    it("fell_for_social_engineering + over_quarantined = fired (2 negatives)", () => {
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

  describe("DM choice data integrity", () => {
    it("bad choice has negative trustDelta", () => {
      const choiceMsg = SOCIAL_ENGINEERING_DM.find((m) => m.choices)!;
      const badChoice = choiceMsg.choices!.find((c) => !c.isCorrect)!;
      expect(badChoice.trustDelta).toBeLessThan(0);
    });

    it("good choices have positive trustDelta", () => {
      const choiceMsg = SOCIAL_ENGINEERING_DM.find((m) => m.choices)!;
      const goodChoices = choiceMsg.choices!.filter((c) => c.isCorrect);
      for (const choice of goodChoices) {
        expect(choice.trustDelta).toBeGreaterThan(0);
      }
    });

    it("bad choice has flag for social engineering", () => {
      const choiceMsg = SOCIAL_ENGINEERING_DM.find((m) =>
        m.choices?.some((c) => c.flag === "fell_for_social_engineering")
      )!;
      const badChoice = choiceMsg.choices!.find((c) => !c.isCorrect)!;
      expect(badChoice.flag).toBe("fell_for_social_engineering");
    });

    it("good choices do not have the social engineering flag", () => {
      const choiceMsg = SOCIAL_ENGINEERING_DM.find((m) => m.choices)!;
      const goodChoices = choiceMsg.choices!.filter((c) => c.isCorrect);
      for (const choice of goodChoices) {
        expect(choice.flag).not.toBe("fell_for_social_engineering");
      }
    });
  });
});
