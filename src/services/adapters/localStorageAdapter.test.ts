import { describe, it, expect, beforeEach } from "vitest";
import { localStorageAdapter } from "./localStorageAdapter";

const STORAGE_PREFIX = "ghost-architect";

describe("localStorageAdapter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("createSession", () => {
    it("creates a session with a unique ID", async () => {
      const session = await localStorageAdapter.createSession("anon-1");
      expect(session.id).toBeTruthy();
      expect(typeof session.id).toBe("string");
    });

    it("stores the session in localStorage", async () => {
      const session = await localStorageAdapter.createSession("anon-1");
      const raw = localStorage.getItem(`${STORAGE_PREFIX}:session:${session.id}`);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.data.id).toBe(session.id);
    });

    it("sets startedAt to current time", async () => {
      const before = new Date().toISOString();
      const session = await localStorageAdapter.createSession("anon-1");
      const after = new Date().toISOString();
      expect(session.startedAt >= before).toBe(true);
      expect(session.startedAt <= after).toBe(true);
    });

    it("initializes phaseScores as empty object", async () => {
      const session = await localStorageAdapter.createSession("anon-1");
      expect(session.phaseScores).toEqual({});
    });

    it("associates anonymousId with the session", async () => {
      const session = await localStorageAdapter.createSession("anon-42");
      expect(session.anonymousId).toBe("anon-42");
    });

    it("stores optional playerHandle", async () => {
      const session = await localStorageAdapter.createSession("anon-1", "Ghost42");
      expect(session.playerHandle).toBe("Ghost42");
    });

    it("stores schemaVersion in the wrapped data", async () => {
      const session = await localStorageAdapter.createSession("anon-1");
      const raw = localStorage.getItem(`${STORAGE_PREFIX}:session:${session.id}`);
      const parsed = JSON.parse(raw!);
      expect(parsed.schemaVersion).toBe(1);
    });

    it("tracks current session ID", async () => {
      const session = await localStorageAdapter.createSession("anon-1");
      const currentId = localStorage.getItem(`${STORAGE_PREFIX}:currentSessionId`);
      expect(currentId).toBe(session.id);
    });

    it("generates unique IDs for multiple sessions", async () => {
      const s1 = await localStorageAdapter.createSession("anon-1");
      const s2 = await localStorageAdapter.createSession("anon-1");
      expect(s1.id).not.toBe(s2.id);
    });
  });

  describe("getSession", () => {
    it("retrieves a previously created session by ID", async () => {
      const created = await localStorageAdapter.createSession("anon-1", "Player1");
      const retrieved = await localStorageAdapter.getSession(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.anonymousId).toBe("anon-1");
      expect(retrieved!.playerHandle).toBe("Player1");
    });

    it("returns null for non-existent session ID", async () => {
      const result = await localStorageAdapter.getSession("nonexistent-id");
      expect(result).toBeNull();
    });

    it("throws on corrupted localStorage data", async () => {
      localStorage.setItem(`${STORAGE_PREFIX}:session:bad`, "not-json{{{");
      await expect(localStorageAdapter.getSession("bad")).rejects.toThrow();
    });
  });

  describe("updateSession", () => {
    it("updates phaseScores on an existing session", async () => {
      const session = await localStorageAdapter.createSession("anon-1");
      const updated = await localStorageAdapter.updateSession(session.id, {
        phaseScores: { onboarding: 85 },
      });
      expect(updated.phaseScores.onboarding).toBe(85);
    });

    it("updates totalScore", async () => {
      const session = await localStorageAdapter.createSession("anon-1");
      const updated = await localStorageAdapter.updateSession(session.id, {
        totalScore: 72,
      });
      expect(updated.totalScore).toBe(72);
    });

    it("sets completedAt timestamp", async () => {
      const session = await localStorageAdapter.createSession("anon-1");
      const ts = new Date().toISOString();
      const updated = await localStorageAdapter.updateSession(session.id, {
        completedAt: ts,
      });
      expect(updated.completedAt).toBe(ts);
    });

    it("sets endingReached", async () => {
      const session = await localStorageAdapter.createSession("anon-1");
      const updated = await localStorageAdapter.updateSession(session.id, {
        endingReached: "promoted",
      });
      expect(updated.endingReached).toBe("promoted");
    });

    it("preserves unchanged fields", async () => {
      const session = await localStorageAdapter.createSession("anon-1", "Ghost42");
      await localStorageAdapter.updateSession(session.id, { totalScore: 50 });
      const retrieved = await localStorageAdapter.getSession(session.id);
      expect(retrieved!.playerHandle).toBe("Ghost42");
      expect(retrieved!.anonymousId).toBe("anon-1");
      expect(retrieved!.startedAt).toBe(session.startedAt);
    });

    it("throws for non-existent session ID", async () => {
      await expect(
        localStorageAdapter.updateSession("nonexistent", { totalScore: 10 })
      ).rejects.toThrow("Session nonexistent not found");
    });

    it("persists updates to localStorage", async () => {
      const session = await localStorageAdapter.createSession("anon-1");
      await localStorageAdapter.updateSession(session.id, { totalScore: 99 });
      const raw = localStorage.getItem(`${STORAGE_PREFIX}:session:${session.id}`);
      const parsed = JSON.parse(raw!);
      expect(parsed.data.totalScore).toBe(99);
    });
  });

  describe("save/load round-trip", () => {
    it("round-trips all fields through create and get", async () => {
      const created = await localStorageAdapter.createSession("anon-rt", "RoundTripper");
      await localStorageAdapter.updateSession(created.id, {
        phaseScores: { onboarding: 20, breach: 18 },
        totalScore: 38,
        endingReached: "lateral",
        completedAt: "2026-03-10T12:00:00.000Z",
      });
      const loaded = await localStorageAdapter.getSession(created.id);
      expect(loaded).toEqual({
        id: created.id,
        anonymousId: "anon-rt",
        playerHandle: "RoundTripper",
        startedAt: created.startedAt,
        phaseScores: { onboarding: 20, breach: 18 },
        totalScore: 38,
        endingReached: "lateral",
        completedAt: "2026-03-10T12:00:00.000Z",
      });
    });

    it("survives JSON serialization of all field types", async () => {
      const session = await localStorageAdapter.createSession("anon-json");
      await localStorageAdapter.updateSession(session.id, {
        phaseScores: { onboarding: 0, breach: 25, investigation: 0, debrief: 25 },
        totalScore: 50,
      });
      const raw = localStorage.getItem(`${STORAGE_PREFIX}:session:${session.id}`);
      const reparsed = JSON.parse(raw!);
      expect(reparsed.data.phaseScores.breach).toBe(25);
      expect(reparsed.data.totalScore).toBe(50);
    });
  });

  describe("schema version migration", () => {
    it("loads v0 data (no schemaVersion wrapper) — current impl returns the raw object", async () => {
      // Simulate legacy v0 format: bare session data without schemaVersion wrapper
      const legacySession = {
        id: "legacy-v0",
        anonymousId: "anon-legacy",
        startedAt: "2026-01-01T00:00:00.000Z",
        phaseScores: { onboarding: 10 },
        totalScore: 10,
      };
      // v0 might have stored without a wrapper — getSession does parsed.data,
      // so a bare object would yield undefined. This documents current behavior.
      localStorage.setItem(
        `${STORAGE_PREFIX}:session:legacy-v0`,
        JSON.stringify(legacySession)
      );
      const result = await localStorageAdapter.getSession("legacy-v0");
      // Current implementation: parsed.data is undefined for unwrapped data → returns null
      expect(result).toBeNull();
    });

    it("loads data with matching schemaVersion 1", async () => {
      const wrapped = {
        schemaVersion: 1,
        data: {
          id: "v1-session",
          anonymousId: "anon-v1",
          startedAt: "2026-03-01T00:00:00.000Z",
          phaseScores: {},
          totalScore: 0,
        },
      };
      localStorage.setItem(
        `${STORAGE_PREFIX}:session:v1-session`,
        JSON.stringify(wrapped)
      );
      const result = await localStorageAdapter.getSession("v1-session");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("v1-session");
      expect(result!.anonymousId).toBe("anon-v1");
    });

    it("loads data with older schemaVersion (future migration hook)", async () => {
      // When migration logic is added, schemaVersion < current should trigger it.
      // For now, it loads the data as-is.
      const wrapped = {
        schemaVersion: 0,
        data: {
          id: "old-schema",
          anonymousId: "anon-old",
          startedAt: "2025-12-01T00:00:00.000Z",
          phaseScores: {},
          totalScore: 0,
        },
      };
      localStorage.setItem(
        `${STORAGE_PREFIX}:session:old-schema`,
        JSON.stringify(wrapped)
      );
      const result = await localStorageAdapter.getSession("old-schema");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("old-schema");
    });
  });

  describe("corrupt data recovery", () => {
    it("throws on invalid JSON in localStorage", async () => {
      localStorage.setItem(`${STORAGE_PREFIX}:session:corrupt1`, "{{not json");
      await expect(localStorageAdapter.getSession("corrupt1")).rejects.toThrow();
    });

    it("throws on truncated JSON", async () => {
      localStorage.setItem(
        `${STORAGE_PREFIX}:session:corrupt2`,
        '{"schemaVersion":1,"data":{"id":"trunc'
      );
      await expect(localStorageAdapter.getSession("corrupt2")).rejects.toThrow();
    });

    it("returns null when wrapper has no data field", async () => {
      localStorage.setItem(
        `${STORAGE_PREFIX}:session:nodata`,
        JSON.stringify({ schemaVersion: 1 })
      );
      const result = await localStorageAdapter.getSession("nodata");
      expect(result).toBeNull();
    });

    it("returns null data fields when session data is missing required fields", async () => {
      const partial = {
        schemaVersion: 1,
        data: { id: "partial", anonymousId: "anon-p" },
      };
      localStorage.setItem(
        `${STORAGE_PREFIX}:session:partial`,
        JSON.stringify(partial)
      );
      const result = await localStorageAdapter.getSession("partial");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("partial");
      // Missing fields come through as undefined
      expect(result!.phaseScores).toBeUndefined();
      expect(result!.startedAt).toBeUndefined();
    });
  });

  describe("sessionId key isolation", () => {
    it("stores multiple sessions independently by sessionId", async () => {
      const s1 = await localStorageAdapter.createSession("anon-1", "Player1");
      const s2 = await localStorageAdapter.createSession("anon-2", "Player2");
      const s3 = await localStorageAdapter.createSession("anon-3", "Player3");

      await localStorageAdapter.updateSession(s1.id, { totalScore: 10 });
      await localStorageAdapter.updateSession(s2.id, { totalScore: 20 });
      await localStorageAdapter.updateSession(s3.id, { totalScore: 30 });

      const r1 = await localStorageAdapter.getSession(s1.id);
      const r2 = await localStorageAdapter.getSession(s2.id);
      const r3 = await localStorageAdapter.getSession(s3.id);

      expect(r1!.totalScore).toBe(10);
      expect(r1!.playerHandle).toBe("Player1");
      expect(r2!.totalScore).toBe(20);
      expect(r2!.playerHandle).toBe("Player2");
      expect(r3!.totalScore).toBe(30);
      expect(r3!.playerHandle).toBe("Player3");
    });

    it("updating one session does not affect another", async () => {
      const s1 = await localStorageAdapter.createSession("anon-1");
      const s2 = await localStorageAdapter.createSession("anon-2");

      await localStorageAdapter.updateSession(s1.id, {
        totalScore: 99,
        endingReached: "promoted",
      });

      const r2 = await localStorageAdapter.getSession(s2.id);
      expect(r2!.totalScore).toBe(0);
      expect(r2!.endingReached).toBeUndefined();
    });

    it("uses prefixed keys to avoid collisions with other localStorage data", async () => {
      localStorage.setItem("unrelated-key", "should-not-interfere");
      const session = await localStorageAdapter.createSession("anon-1");
      expect(localStorage.getItem("unrelated-key")).toBe("should-not-interfere");
      const retrieved = await localStorageAdapter.getSession(session.id);
      expect(retrieved!.id).toBe(session.id);
    });
  });

  describe("joinTeam", () => {
    it("creates a local session in offline mode (no-op join)", async () => {
      const session = await localStorageAdapter.joinTeam("CODE", "anon-1");
      expect(session.anonymousId).toBe("anon-1");
      expect(session.id).toBeDefined();
      expect(session.totalScore).toBe(0);
    });
  });

  describe("getLeaderboard", () => {
    it("throws not-supported error in offline mode", async () => {
      await expect(
        localStorageAdapter.getLeaderboard("team-1")
      ).rejects.toThrow("not supported in offline mode");
    });
  });

  describe("subscribeLeaderboard", () => {
    it("throws not-supported error in offline mode", () => {
      expect(() =>
        localStorageAdapter.subscribeLeaderboard("team-1", () => {})
      ).toThrow("not supported in offline mode");
    });
  });
});
