import { describe, it, expect, beforeEach } from "vitest";
import { useScoreStore } from "./scoreStore";

describe("scoreStore", () => {
  beforeEach(() => {
    useScoreStore.getState().reset();
  });

  describe("initial state", () => {
    it("starts with trust score of 50", () => {
      expect(useScoreStore.getState().trustScore).toBe(50);
    });

    it("starts with all category scores at 0", () => {
      const { categoryScores } = useScoreStore.getState();
      expect(categoryScores.phishingIQ).toBe(0);
      expect(categoryScores.passwordHygiene).toBe(0);
      expect(categoryScores.networkSecurity).toBe(0);
      expect(categoryScores.forensicSkill).toBe(0);
    });

    it("starts with empty actions array", () => {
      expect(useScoreStore.getState().actions).toHaveLength(0);
    });
  });

  describe("addAction", () => {
    it("adds an action and updates category score", () => {
      useScoreStore.getState().addAction({
        id: "email-1",
        category: "phishingIQ",
        points: 5,
        maxPoints: 5,
        label: "Caught phishing email",
      });
      expect(useScoreStore.getState().categoryScores.phishingIQ).toBe(5);
      expect(useScoreStore.getState().actions).toHaveLength(1);
    });

    it("accumulates points in the same category", () => {
      useScoreStore.getState().addAction({
        id: "email-1",
        category: "phishingIQ",
        points: 5,
        maxPoints: 5,
        label: "Caught email 1",
      });
      useScoreStore.getState().addAction({
        id: "email-2",
        category: "phishingIQ",
        points: 5,
        maxPoints: 5,
        label: "Caught email 2",
      });
      expect(useScoreStore.getState().categoryScores.phishingIQ).toBe(10);
      expect(useScoreStore.getState().actions).toHaveLength(2);
    });

    it("caps category score at 25", () => {
      useScoreStore.getState().addAction({
        id: "big-score",
        category: "phishingIQ",
        points: 30,
        maxPoints: 25,
        label: "Overshoot",
      });
      expect(useScoreStore.getState().categoryScores.phishingIQ).toBe(25);
    });

    it("caps cumulative score at 25", () => {
      useScoreStore.getState().addAction({
        id: "a1",
        category: "networkSecurity",
        points: 20,
        maxPoints: 20,
        label: "A",
      });
      useScoreStore.getState().addAction({
        id: "a2",
        category: "networkSecurity",
        points: 20,
        maxPoints: 20,
        label: "B",
      });
      expect(useScoreStore.getState().categoryScores.networkSecurity).toBe(25);
    });

    it("adds timestamp to action", () => {
      useScoreStore.getState().addAction({
        id: "ts-test",
        category: "forensicSkill",
        points: 3,
        maxPoints: 5,
        label: "Flagged log",
      });
      const action = useScoreStore.getState().actions[0];
      expect(action.timestamp).toBeTypeOf("number");
      expect(action.timestamp).toBeGreaterThan(0);
    });

    it("does not affect other categories", () => {
      useScoreStore.getState().addAction({
        id: "pw",
        category: "passwordHygiene",
        points: 10,
        maxPoints: 10,
        label: "Strong password",
      });
      expect(useScoreStore.getState().categoryScores.phishingIQ).toBe(0);
      expect(useScoreStore.getState().categoryScores.networkSecurity).toBe(0);
      expect(useScoreStore.getState().categoryScores.forensicSkill).toBe(0);
    });
  });

  describe("setTrustScore", () => {
    it("sets trust score to a specific value", () => {
      useScoreStore.getState().setTrustScore(80);
      expect(useScoreStore.getState().trustScore).toBe(80);
    });

    it("clamps trust score to 0 minimum", () => {
      useScoreStore.getState().setTrustScore(-10);
      expect(useScoreStore.getState().trustScore).toBe(0);
    });

    it("clamps trust score to 100 maximum", () => {
      useScoreStore.getState().setTrustScore(150);
      expect(useScoreStore.getState().trustScore).toBe(100);
    });
  });

  describe("adjustTrust", () => {
    it("increases trust score by delta", () => {
      useScoreStore.getState().adjustTrust(20);
      expect(useScoreStore.getState().trustScore).toBe(70);
    });

    it("decreases trust score by negative delta", () => {
      useScoreStore.getState().adjustTrust(-30);
      expect(useScoreStore.getState().trustScore).toBe(20);
    });

    it("clamps at 0 on large negative delta", () => {
      useScoreStore.getState().adjustTrust(-100);
      expect(useScoreStore.getState().trustScore).toBe(0);
    });

    it("clamps at 100 on large positive delta", () => {
      useScoreStore.getState().adjustTrust(100);
      expect(useScoreStore.getState().trustScore).toBe(100);
    });
  });

  describe("reset", () => {
    it("resets trust score to 50", () => {
      useScoreStore.getState().setTrustScore(90);
      useScoreStore.getState().reset();
      expect(useScoreStore.getState().trustScore).toBe(50);
    });

    it("resets all category scores to 0", () => {
      useScoreStore.getState().addAction({
        id: "r1",
        category: "phishingIQ",
        points: 10,
        maxPoints: 10,
        label: "Test",
      });
      useScoreStore.getState().reset();
      const { categoryScores } = useScoreStore.getState();
      expect(categoryScores.phishingIQ).toBe(0);
      expect(categoryScores.passwordHygiene).toBe(0);
      expect(categoryScores.networkSecurity).toBe(0);
      expect(categoryScores.forensicSkill).toBe(0);
    });

    it("clears all actions", () => {
      useScoreStore.getState().addAction({
        id: "r2",
        category: "forensicSkill",
        points: 5,
        maxPoints: 5,
        label: "Test",
      });
      useScoreStore.getState().reset();
      expect(useScoreStore.getState().actions).toHaveLength(0);
    });
  });
});
