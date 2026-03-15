import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockSessionFindUnique = vi.fn();
const mockSessionUpdate = vi.fn();

vi.mock("@/lib/prisma", () => {
  class NoDatabaseError extends Error {
    constructor() { super("Database not configured"); this.name = "NoDatabaseError"; }
  }
  return {
    requirePrisma: vi.fn(() => ({
      session: {
        findUnique: mockSessionFindUnique,
        update: mockSessionUpdate,
      },
    })),
    NoDatabaseError,
  };
});

vi.mock("@/lib/leaderboard", () => ({
  computeAndBroadcastLeaderboard: vi.fn().mockResolvedValue(undefined),
}));

import { GET, PATCH } from "./route";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const baseSession = {
  id: "sess-1",
  teamId: "team-1",
  anonymousId: "anon-owner",
  playerHandle: "Ghost42",
  startedAt: new Date("2026-03-10T12:00:00Z"),
  completedAt: null,
  phaseScores: { onboarding: 20 },
  totalScore: 20,
  endingReached: null,
  deviceInfo: null,
};

describe("GET /api/v1/sessions/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns session data", async () => {
    mockSessionFindUnique.mockResolvedValue(baseSession as never);

    const req = new NextRequest("http://localhost/api/v1/sessions/sess-1", {
      headers: { "x-anonymous-id": "anon-owner" },
    });
    const res = await GET(req, makeParams("sess-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe("sess-1");
    expect(json.anonymousId).toBeUndefined(); // stripped from response (GAP-12)
    expect(json.phaseScores.onboarding).toBe(20);
  });

  it("returns 404 for non-existent session", async () => {
    mockSessionFindUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/v1/sessions/nonexistent");
    const res = await GET(req, makeParams("nonexistent"));

    expect(res.status).toBe(404);
  });

  it("returns startedAt as ISO string", async () => {
    mockSessionFindUnique.mockResolvedValue(baseSession as never);

    const req = new NextRequest("http://localhost/api/v1/sessions/sess-1", {
      headers: { "x-anonymous-id": "anon-owner" },
    });
    const res = await GET(req, makeParams("sess-1"));
    const json = await res.json();

    expect(json.startedAt).toBe("2026-03-10T12:00:00.000Z");
  });
});

describe("PATCH /api/v1/sessions/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates phaseScores with correct anonymousId", async () => {
    mockSessionFindUnique.mockResolvedValue(baseSession as never);
    const updatedSession = {
      ...baseSession,
      phaseScores: { onboarding: 20, breach: 22 },
      totalScore: 42,
    };
    mockSessionUpdate.mockResolvedValue(updatedSession as never);

    const req = new NextRequest("http://localhost/api/v1/sessions/sess-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonymousId: "anon-owner",
        phaseScores: { breach: 22 },
        totalScore: 42,
      }),
    });
    const res = await PATCH(req, makeParams("sess-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.phaseScores.breach).toBe(22);
    expect(json.totalScore).toBe(42);
  });

  it("returns 403 with wrong anonymousId", async () => {
    mockSessionFindUnique.mockResolvedValue(baseSession as never);

    const req = new NextRequest("http://localhost/api/v1/sessions/sess-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonymousId: "anon-intruder",
        phaseScores: { breach: 99 },
      }),
    });
    const res = await PATCH(req, makeParams("sess-1"));

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/[Ff]orbidden/);
  });

  it("returns 404 for non-existent session", async () => {
    mockSessionFindUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/v1/sessions/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonymousId: "anon-owner",
        totalScore: 50,
      }),
    });
    const res = await PATCH(req, makeParams("nonexistent"));

    expect(res.status).toBe(404);
  });

  it("merges phaseScores atomically (preserves existing keys)", async () => {
    mockSessionFindUnique.mockResolvedValue(baseSession as never);
    mockSessionUpdate.mockImplementation(async (args: unknown) => {
      const { data } = args as { data: Record<string, unknown> };
      return { ...baseSession, ...data } as never;
    });

    const req = new NextRequest("http://localhost/api/v1/sessions/sess-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonymousId: "anon-owner",
        phaseScores: { breach: 18 },
      }),
    });
    await PATCH(req, makeParams("sess-1"));

    // Check that prisma.session.update was called with merged phaseScores
    const updateCall = mockSessionUpdate.mock.calls[0][0] as {
      data: { phaseScores?: Record<string, number> };
    };
    expect(updateCall.data.phaseScores).toEqual({
      onboarding: 20,
      breach: 18,
    });
  });

  it("sets completedAt and endingReached", async () => {
    mockSessionFindUnique.mockResolvedValue(baseSession as never);
    const completed = {
      ...baseSession,
      completedAt: new Date("2026-03-10T13:00:00Z"),
      endingReached: "promoted",
      totalScore: 94,
    };
    mockSessionUpdate.mockResolvedValue(completed as never);

    const req = new NextRequest("http://localhost/api/v1/sessions/sess-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonymousId: "anon-owner",
        completedAt: "2026-03-10T13:00:00Z",
        endingReached: "promoted",
        totalScore: 94,
      }),
    });
    const res = await PATCH(req, makeParams("sess-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.endingReached).toBe("promoted");
    expect(json.completedAt).toBe("2026-03-10T13:00:00.000Z");
  });
});
