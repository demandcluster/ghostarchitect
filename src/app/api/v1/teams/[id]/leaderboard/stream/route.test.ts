import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockTeamFindUnique = vi.fn();
const mockSessionFindMany = vi.fn();

vi.mock("@/lib/prisma", () => {
  class NoDatabaseError extends Error {
    constructor() { super("Database not configured"); this.name = "NoDatabaseError"; }
  }
  return {
    requirePrisma: vi.fn(() => ({
      team: { findUnique: mockTeamFindUnique },
      session: { findMany: mockSessionFindMany },
    })),
    NoDatabaseError,
  };
});

vi.mock("@/lib/leaderboard", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/leaderboard")>();
  return {
    ...original,
    computeLeaderboardSnapshot: vi.fn().mockResolvedValue({
      teamId: "team-1",
      teamName: "Test Team",
      updatedAt: "2026-03-10T12:00:00.000Z",
      rankings: [],
    }),
  };
});

import { GET } from "./route";
import { computeLeaderboardSnapshot, addSSEClient, removeSSEClient } from "@/lib/leaderboard";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeSSERequest(url: string): NextRequest {
  const controller = new AbortController();
  return new NextRequest(url, { signal: controller.signal });
}

const mockTeam = {
  id: "team-1",
  name: "Test Team",
  inviteCode: "BCD123",
  isActive: true,
  expiresAt: null,
  trainerId: "trainer-1",
  createdAt: new Date(),
  retainUntil: null,
};

describe("GET /api/v1/teams/[id]/leaderboard/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for non-existent team", async () => {
    mockTeamFindUnique.mockResolvedValue(null);

    const req = makeSSERequest("http://localhost/api/v1/teams/nonexistent/leaderboard/stream");
    const res = await GET(req, makeParams("nonexistent"));

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/[Tt]eam not found/);
  });

  it("opens SSE connection with correct Content-Type", async () => {
    mockTeamFindUnique.mockResolvedValue(mockTeam as never);

    const req = makeSSERequest("http://localhost/api/v1/teams/team-1/leaderboard/stream");
    const res = await GET(req, makeParams("team-1"));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
    expect(res.headers.get("Connection")).toBe("keep-alive");
  });

  it("sends initial leaderboard snapshot on connection", async () => {
    mockTeamFindUnique.mockResolvedValue(mockTeam as never);
    vi.mocked(computeLeaderboardSnapshot).mockResolvedValue({
      teamId: "team-1",
      teamName: "Test Team",
      updatedAt: "2026-03-10T12:00:00.000Z",
      rankings: [
        {
          rank: 1,
          playerHandle: "Ghost42",
          totalScore: 94,
          completedAt: "2026-03-10T13:00:00.000Z",
          phaseScores: { onboarding: 25, breach: 24, investigation: 23, debrief: 22 },
          endingReached: "promoted",
        },
      ],
    });

    const req = makeSSERequest("http://localhost/api/v1/teams/team-1/leaderboard/stream");
    const res = await GET(req, makeParams("team-1"));

    // Read the first chunk from the stream
    const reader = res.body!.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain("data:");
    expect(text).toContain("Ghost42");
    expect(text).toContain('"totalScore":94');

    reader.releaseLock();
  });

  it("calls computeLeaderboardSnapshot with the correct teamId", async () => {
    mockTeamFindUnique.mockResolvedValue(mockTeam as never);

    const req = makeSSERequest("http://localhost/api/v1/teams/team-1/leaderboard/stream");
    await GET(req, makeParams("team-1"));

    expect(computeLeaderboardSnapshot).toHaveBeenCalledWith("team-1");
  });
});

describe("SSE fan-out isolation", () => {
  it("addSSEClient/removeSSEClient manage team-scoped writers", () => {
    // This tests the leaderboard module's fan-out logic directly
    const { readable, writable } = new TransformStream<Uint8Array>();
    const writer = writable.getWriter();

    // Should not throw
    addSSEClient("team-A", writer);
    removeSSEClient("team-A", writer);

    // Removing from a different team is a no-op
    const { writable: w2 } = new TransformStream<Uint8Array>();
    const writer2 = w2.getWriter();
    addSSEClient("team-B", writer2);
    removeSSEClient("team-A", writer2); // no-op, different team

    writer.close().catch(() => {});
    writer2.close().catch(() => {});
  });
});
