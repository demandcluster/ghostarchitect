import { describe, it, expect, beforeEach } from "vitest";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";

/** Simulates handleChoice logic from MFAPuzzle component */
function simulateMFAChoice(choice: "authenticator" | "sms") {
  const store = useScoreStore.getState();
  const narrative = useNarrativeStore.getState();

  narrative.setDecision("mfa_choice", choice);

  if (choice === "authenticator") {
    store.addAction({
      id: "mfa-auth",
      category: "passwordHygiene",
      points: 5,
      maxPoints: 5,
      label: "Chose authenticator app for MFA",
    });
    store.adjustTrust(5);
    narrative.addFlag("chose_strong_mfa");
  } else {
    store.addAction({
      id: "mfa-sms",
      category: "passwordHygiene",
      points: 2,
      maxPoints: 5,
      label: "Chose SMS for MFA (vulnerable to SIM swap)",
    });
    store.adjustTrust(2);
  }
}

describe("mfaPuzzle", () => {
  beforeEach(() => {
    useScoreStore.getState().reset();
    useNarrativeStore.getState().reset();
  });

  describe("authenticator app choice", () => {
    it("scores full points (5) in passwordHygiene", () => {
      simulateMFAChoice("authenticator");
      expect(useScoreStore.getState().categoryScores.passwordHygiene).toBe(5);
    });

    it("adds 5 trust points", () => {
      const initialTrust = useScoreStore.getState().trustScore;
      simulateMFAChoice("authenticator");
      expect(useScoreStore.getState().trustScore).toBe(initialTrust + 5);
    });

    it("sets chose_strong_mfa flag", () => {
      simulateMFAChoice("authenticator");
      expect(useNarrativeStore.getState().hasFlag("chose_strong_mfa")).toBe(true);
    });

    it("records mfa_choice as authenticator", () => {
      simulateMFAChoice("authenticator");
      expect(useNarrativeStore.getState().decisions.mfa_choice).toBe("authenticator");
    });
  });

  describe("SMS choice", () => {
    it("scores partial points (2) in passwordHygiene", () => {
      simulateMFAChoice("sms");
      expect(useScoreStore.getState().categoryScores.passwordHygiene).toBe(2);
    });

    it("adds only 2 trust points", () => {
      const initialTrust = useScoreStore.getState().trustScore;
      simulateMFAChoice("sms");
      expect(useScoreStore.getState().trustScore).toBe(initialTrust + 2);
    });

    it("does not set chose_strong_mfa flag", () => {
      simulateMFAChoice("sms");
      expect(useNarrativeStore.getState().hasFlag("chose_strong_mfa")).toBe(false);
    });

    it("records mfa_choice as sms", () => {
      simulateMFAChoice("sms");
      expect(useNarrativeStore.getState().decisions.mfa_choice).toBe("sms");
    });
  });

  describe("scoring comparison", () => {
    it("authenticator scores more than SMS", () => {
      simulateMFAChoice("authenticator");
      const authScore = useScoreStore.getState().categoryScores.passwordHygiene;

      useScoreStore.getState().reset();
      simulateMFAChoice("sms");
      const smsScore = useScoreStore.getState().categoryScores.passwordHygiene;

      expect(authScore).toBeGreaterThan(smsScore);
    });

    it("authenticator grants more trust than SMS", () => {
      simulateMFAChoice("authenticator");
      const authTrust = useScoreStore.getState().trustScore;

      useScoreStore.getState().reset();
      simulateMFAChoice("sms");
      const smsTrust = useScoreStore.getState().trustScore;

      expect(authTrust).toBeGreaterThan(smsTrust);
    });
  });
});
