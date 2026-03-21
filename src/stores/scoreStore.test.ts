import { describe, it, expect, beforeEach } from "vitest";
import { useScoreStore } from "./scoreStore";

describe("scoreStore", () => {
  beforeEach(() => {
    useScoreStore.getState().reset();
  });

  describe("trustScore", () => {
    it("initializes with 50", () => {
      expect(useScoreStore.getState().trustScore).toBe(50);
    });

    it("sets trust score within 0-100 bounds", () => {
      const { setTrustScore } = useScoreStore.getState();
      setTrustScore(150);
      expect(useScoreStore.getState().trustScore).toBe(100);
      setTrustScore(-50);
      expect(useScoreStore.getState().trustScore).toBe(0);
    });

    it("adjusts trust with delta", () => {
      const { adjustTrust } = useScoreStore.getState();
      adjustTrust(10);
      expect(useScoreStore.getState().trustScore).toBe(60);
      adjustTrust(-20);
      expect(useScoreStore.getState().trustScore).toBe(40);
    });
  });

  describe("actions and category scores", () => {
    it("adds an action and updates category score", () => {
      const { addAction } = useScoreStore.getState();
      addAction({
        id: "test-phish",
        category: "phishingIQ",
        points: 10,
        maxPoints: 10,
        label: "Caught phishing",
      });

      const state = useScoreStore.getState();
      expect(state.actions).toHaveLength(1);
      expect(state.actions[0].label).toBe("Caught phishing");
      expect(state.categoryScores.phishingIQ).toBe(10);
    });

    it("does not cap category score at 125", () => {
      const { addAction } = useScoreStore.getState();
      addAction({
        id: "test-1",
        category: "phishingIQ",
        points: 200,
        maxPoints: 200,
        label: "Large action",
      });
      expect(useScoreStore.getState().categoryScores.phishingIQ).toBe(200);
    });

    it("accumulates cumulative score beyond 125", () => {
      const { addAction } = useScoreStore.getState();
      addAction({
        id: "test-1",
        category: "networkSecurity",
        points: 100,
        maxPoints: 100,
        label: "Action 1",
      });
      addAction({
        id: "test-2",
        category: "networkSecurity",
        points: 100,
        maxPoints: 100,
        label: "Action 2",
      });
      expect(useScoreStore.getState().categoryScores.networkSecurity).toBe(200);
    });
  });
});
