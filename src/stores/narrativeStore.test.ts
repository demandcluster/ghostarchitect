import { describe, it, expect, beforeEach } from "vitest";
import { useNarrativeStore } from "./narrativeStore";

describe("narrativeStore", () => {
  beforeEach(() => {
    useNarrativeStore.getState().reset();
  });

  describe("initial state", () => {
    it("starts with empty decisions", () => {
      expect(useNarrativeStore.getState().decisions).toEqual({});
    });

    it("starts with empty flags set", () => {
      expect(useNarrativeStore.getState().flags.size).toBe(0);
    });

    it("starts with empty timeline", () => {
      expect(useNarrativeStore.getState().timeline).toHaveLength(0);
    });
  });

  describe("setDecision", () => {
    it("records a decision", () => {
      useNarrativeStore.getState().setDecision("mfa_choice", "authenticator");
      expect(useNarrativeStore.getState().decisions.mfa_choice).toBe("authenticator");
    });

    it("overwrites an existing decision", () => {
      useNarrativeStore.getState().setDecision("mfa_choice", "sms");
      useNarrativeStore.getState().setDecision("mfa_choice", "authenticator");
      expect(useNarrativeStore.getState().decisions.mfa_choice).toBe("authenticator");
    });

    it("stores multiple independent decisions", () => {
      useNarrativeStore.getState().setDecision("mfa_choice", "authenticator");
      useNarrativeStore.getState().setDecision("wifi_choice", "corporate");
      const { decisions } = useNarrativeStore.getState();
      expect(decisions.mfa_choice).toBe("authenticator");
      expect(decisions.wifi_choice).toBe("corporate");
    });
  });

  describe("addFlag / removeFlag / hasFlag", () => {
    it("adds a flag", () => {
      useNarrativeStore.getState().addFlag("caught_all_phishing");
      expect(useNarrativeStore.getState().flags.has("caught_all_phishing")).toBe(true);
    });

    it("hasFlag returns true for existing flag", () => {
      useNarrativeStore.getState().addFlag("avoided_evil_twin");
      expect(useNarrativeStore.getState().hasFlag("avoided_evil_twin")).toBe(true);
    });

    it("hasFlag returns false for non-existing flag", () => {
      expect(useNarrativeStore.getState().hasFlag("nonexistent")).toBe(false);
    });

    it("removes a flag", () => {
      useNarrativeStore.getState().addFlag("over_quarantined");
      useNarrativeStore.getState().removeFlag("over_quarantined");
      expect(useNarrativeStore.getState().hasFlag("over_quarantined")).toBe(false);
    });

    it("removing a non-existing flag is a no-op", () => {
      useNarrativeStore.getState().removeFlag("nonexistent");
      expect(useNarrativeStore.getState().flags.size).toBe(0);
    });

    it("does not duplicate flags on repeated adds", () => {
      useNarrativeStore.getState().addFlag("test_flag");
      useNarrativeStore.getState().addFlag("test_flag");
      expect(useNarrativeStore.getState().flags.size).toBe(1);
    });
  });

  describe("addTimelineEntry", () => {
    it("adds a timeline entry with auto-generated timestamp", () => {
      useNarrativeStore.getState().addTimelineEntry({
        id: "t1",
        phase: "onboarding",
        description: "Chose authenticator MFA",
        decisionKey: "mfa_choice",
      });
      const { timeline } = useNarrativeStore.getState();
      expect(timeline).toHaveLength(1);
      expect(timeline[0].id).toBe("t1");
      expect(timeline[0].phase).toBe("onboarding");
      expect(timeline[0].timestamp).toBeTypeOf("number");
    });

    it("preserves order of entries", () => {
      useNarrativeStore.getState().addTimelineEntry({
        id: "t1",
        phase: "onboarding",
        description: "First",
      });
      useNarrativeStore.getState().addTimelineEntry({
        id: "t2",
        phase: "breach",
        description: "Second",
      });
      const { timeline } = useNarrativeStore.getState();
      expect(timeline[0].id).toBe("t1");
      expect(timeline[1].id).toBe("t2");
    });
  });

  describe("reset", () => {
    it("clears decisions", () => {
      useNarrativeStore.getState().setDecision("key", "val");
      useNarrativeStore.getState().reset();
      expect(useNarrativeStore.getState().decisions).toEqual({});
    });

    it("clears flags", () => {
      useNarrativeStore.getState().addFlag("test");
      useNarrativeStore.getState().reset();
      expect(useNarrativeStore.getState().flags.size).toBe(0);
    });

    it("clears timeline", () => {
      useNarrativeStore.getState().addTimelineEntry({
        id: "t1",
        phase: "onboarding",
        description: "Test",
      });
      useNarrativeStore.getState().reset();
      expect(useNarrativeStore.getState().timeline).toHaveLength(0);
    });
  });
});
