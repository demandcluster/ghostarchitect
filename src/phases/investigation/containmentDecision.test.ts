import { describe, it, expect, beforeEach } from "vitest";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";

/** Simulates handleChoice from ContainmentDecision component */
function simulateContainment(option: "isolate" | "monitor") {
  const store = useScoreStore.getState();
  const narrative = useNarrativeStore.getState();

  narrative.setDecision("containment", option);

  if (option === "isolate") {
    narrative.addFlag("contained_quickly");
    store.addAction({
      id: "containment-isolate",
      category: "forensicSkill",
      points: 5,
      maxPoints: 5,
      label: "Isolated compromised systems immediately",
    });
    store.adjustTrust(10);
  } else {
    store.addAction({
      id: "containment-monitor",
      category: "forensicSkill",
      points: 2,
      maxPoints: 5,
      label: "Kept systems connected to monitor attacker",
    });
    store.adjustTrust(-5);
  }
}

describe("containmentDecision", () => {
  beforeEach(() => {
    useScoreStore.getState().reset();
    useNarrativeStore.getState().reset();
  });

  describe("isolate choice (correct)", () => {
    it("scores full forensicSkill points (5)", () => {
      simulateContainment("isolate");
      expect(useScoreStore.getState().categoryScores.forensicSkill).toBe(5);
    });

    it("adds 10 trust points", () => {
      const initial = useScoreStore.getState().trustScore;
      simulateContainment("isolate");
      expect(useScoreStore.getState().trustScore).toBe(initial + 10);
    });

    it("sets contained_quickly flag", () => {
      simulateContainment("isolate");
      expect(useNarrativeStore.getState().hasFlag("contained_quickly")).toBe(true);
    });

    it("records containment decision as isolate", () => {
      simulateContainment("isolate");
      expect(useNarrativeStore.getState().decisions.containment).toBe("isolate");
    });
  });

  describe("monitor choice (risky)", () => {
    it("scores partial forensicSkill points (2)", () => {
      simulateContainment("monitor");
      expect(useScoreStore.getState().categoryScores.forensicSkill).toBe(2);
    });

    it("penalises trust by 5", () => {
      const initial = useScoreStore.getState().trustScore;
      simulateContainment("monitor");
      expect(useScoreStore.getState().trustScore).toBe(initial - 5);
    });

    it("does not set contained_quickly flag", () => {
      simulateContainment("monitor");
      expect(useNarrativeStore.getState().hasFlag("contained_quickly")).toBe(false);
    });

    it("records containment decision as monitor", () => {
      simulateContainment("monitor");
      expect(useNarrativeStore.getState().decisions.containment).toBe("monitor");
    });
  });

  describe("scoring comparison", () => {
    it("isolate scores more than monitor", () => {
      simulateContainment("isolate");
      const isolateScore = useScoreStore.getState().categoryScores.forensicSkill;

      useScoreStore.getState().reset();
      simulateContainment("monitor");
      const monitorScore = useScoreStore.getState().categoryScores.forensicSkill;

      expect(isolateScore).toBeGreaterThan(monitorScore);
    });

    it("isolate grants more trust than monitor", () => {
      simulateContainment("isolate");
      const isolateTrust = useScoreStore.getState().trustScore;

      useScoreStore.getState().reset();
      simulateContainment("monitor");
      const monitorTrust = useScoreStore.getState().trustScore;

      expect(isolateTrust).toBeGreaterThan(monitorTrust);
    });
  });
});
