import { describe, it, expect, beforeEach } from "vitest";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";

interface RotationStep {
  id: string;
  label: string;
  isCorrect: boolean;
}

const STEPS: RotationStep[] = [
  { id: "reset-svc", label: "Reset svc_backup password", isCorrect: true },
  { id: "revoke-sessions", label: "Revoke active sessions for svc_backup", isCorrect: true },
  { id: "audit-access", label: "Audit svc_backup access permissions", isCorrect: true },
  { id: "check-persistence", label: "Check for persistence mechanisms", isCorrect: true },
  { id: "mass-reset", label: "Force company-wide password reset", isCorrect: false },
  { id: "notify-ciso", label: "Notify CISO and Legal (GDPR 72-hour clock)", isCorrect: true },
];

/** Simulates handleSubmit from CredentialRotation component */
function simulateCredentialRotation(selectedIds: Set<string>) {
  const store = useScoreStore.getState();
  const narrative = useNarrativeStore.getState();

  const correctSteps = STEPS.filter((s) => s.isCorrect);
  const selectedCorrect = correctSteps.filter((s) => selectedIds.has(s.id)).length;
  const selectedWrong = STEPS.filter((s) => !s.isCorrect && selectedIds.has(s.id)).length;

  const points = Math.max(
    0,
    Math.round(((selectedCorrect - selectedWrong) / correctSteps.length) * 5)
  );

  store.addAction({
    id: "credential-rotation",
    category: "forensicSkill",
    points,
    maxPoints: 5,
    label: `Post-breach actions: ${selectedCorrect}/${correctSteps.length} correct steps`,
  });

  if (selectedCorrect === correctSteps.length && selectedWrong === 0) {
    narrative.addFlag("rotated_credentials");
  }

  if (selectedIds.has("notify-ciso")) {
    narrative.addFlag("escalated_in_time");
  }
}

describe("credentialRotation", () => {
  beforeEach(() => {
    useScoreStore.getState().reset();
    useNarrativeStore.getState().reset();
  });

  describe("step data", () => {
    it("has 6 steps total", () => {
      expect(STEPS).toHaveLength(6);
    });

    it("has 5 correct and 1 incorrect step", () => {
      expect(STEPS.filter((s) => s.isCorrect)).toHaveLength(5);
      expect(STEPS.filter((s) => !s.isCorrect)).toHaveLength(1);
    });

    it("mass-reset is the incorrect step", () => {
      const wrong = STEPS.find((s) => !s.isCorrect)!;
      expect(wrong.id).toBe("mass-reset");
    });
  });

  describe("all correct steps selected, no wrong", () => {
    it("scores full forensicSkill points (5)", () => {
      const selected = new Set(STEPS.filter((s) => s.isCorrect).map((s) => s.id));
      simulateCredentialRotation(selected);
      expect(useScoreStore.getState().categoryScores.forensicSkill).toBe(5);
    });

    it("sets rotated_credentials flag", () => {
      const selected = new Set(STEPS.filter((s) => s.isCorrect).map((s) => s.id));
      simulateCredentialRotation(selected);
      expect(useNarrativeStore.getState().hasFlag("rotated_credentials")).toBe(true);
    });

    it("sets escalated_in_time flag (notify-ciso selected)", () => {
      const selected = new Set(STEPS.filter((s) => s.isCorrect).map((s) => s.id));
      simulateCredentialRotation(selected);
      expect(useNarrativeStore.getState().hasFlag("escalated_in_time")).toBe(true);
    });
  });

  describe("selecting the wrong step (mass-reset)", () => {
    it("reduces score when mass-reset is included", () => {
      const allIds = new Set(STEPS.map((s) => s.id));
      simulateCredentialRotation(allIds);
      // 5 correct - 1 wrong = 4, (4/5)*5 = 4
      expect(useScoreStore.getState().categoryScores.forensicSkill).toBe(4);
    });

    it("does not set rotated_credentials when wrong step selected", () => {
      const allIds = new Set(STEPS.map((s) => s.id));
      simulateCredentialRotation(allIds);
      expect(useNarrativeStore.getState().hasFlag("rotated_credentials")).toBe(false);
    });
  });

  describe("partial selection", () => {
    it("selecting only 2 correct steps scores proportionally", () => {
      simulateCredentialRotation(new Set(["reset-svc", "revoke-sessions"]));
      // (2/5)*5 = 2
      expect(useScoreStore.getState().categoryScores.forensicSkill).toBe(2);
    });

    it("not selecting notify-ciso does not set escalated_in_time", () => {
      simulateCredentialRotation(new Set(["reset-svc"]));
      expect(useNarrativeStore.getState().hasFlag("escalated_in_time")).toBe(false);
    });
  });

  describe("no selection", () => {
    it("scores 0 points", () => {
      simulateCredentialRotation(new Set());
      expect(useScoreStore.getState().categoryScores.forensicSkill).toBe(0);
    });
  });
});
