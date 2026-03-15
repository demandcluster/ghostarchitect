import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "./gameStore";

describe("gameStore", () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  describe("initial state", () => {
    it("starts in onboarding phase", () => {
      expect(useGameStore.getState().phase).toBe("onboarding");
    });

    it("starts in corporate visual mode", () => {
      expect(useGameStore.getState().visualMode).toBe("corporate");
    });

    it("has no session ID until explicitly initialized", () => {
      expect(useGameStore.getState().sessionId).toBeNull();
    });

    it("is not transitioning", () => {
      expect(useGameStore.getState().isTransitioning).toBe(false);
    });
  });

  describe("setPhase", () => {
    it("transitions to breach phase", () => {
      useGameStore.getState().setPhase("breach");
      expect(useGameStore.getState().phase).toBe("breach");
    });

    it("transitions to investigation phase", () => {
      useGameStore.getState().setPhase("investigation");
      expect(useGameStore.getState().phase).toBe("investigation");
    });

    it("transitions to debrief phase", () => {
      useGameStore.getState().setPhase("debrief");
      expect(useGameStore.getState().phase).toBe("debrief");
    });
  });

  describe("setVisualMode", () => {
    it("switches to breach mode", () => {
      useGameStore.getState().setVisualMode("breach");
      expect(useGameStore.getState().visualMode).toBe("breach");
    });

    it("switches back to corporate mode", () => {
      useGameStore.getState().setVisualMode("breach");
      useGameStore.getState().setVisualMode("corporate");
      expect(useGameStore.getState().visualMode).toBe("corporate");
    });
  });

  describe("setSessionId", () => {
    it("updates session ID", () => {
      useGameStore.getState().setSessionId("test-session-123");
      expect(useGameStore.getState().sessionId).toBe("test-session-123");
    });
  });

  describe("setIsTransitioning", () => {
    it("sets transitioning to true", () => {
      useGameStore.getState().setIsTransitioning(true);
      expect(useGameStore.getState().isTransitioning).toBe(true);
    });

    it("sets transitioning back to false", () => {
      useGameStore.getState().setIsTransitioning(true);
      useGameStore.getState().setIsTransitioning(false);
      expect(useGameStore.getState().isTransitioning).toBe(false);
    });
  });

  describe("reset", () => {
    it("resets phase to onboarding", () => {
      useGameStore.getState().setPhase("debrief");
      useGameStore.getState().reset();
      expect(useGameStore.getState().phase).toBe("onboarding");
    });

    it("resets visual mode to corporate", () => {
      useGameStore.getState().setVisualMode("breach");
      useGameStore.getState().reset();
      expect(useGameStore.getState().visualMode).toBe("corporate");
    });

    it("clears session ID on reset", () => {
      useGameStore.getState().setSessionId("some-session");
      useGameStore.getState().reset();
      expect(useGameStore.getState().sessionId).toBeNull();
    });

    it("resets isTransitioning to false", () => {
      useGameStore.getState().setIsTransitioning(true);
      useGameStore.getState().reset();
      expect(useGameStore.getState().isTransitioning).toBe(false);
    });
  });
});
