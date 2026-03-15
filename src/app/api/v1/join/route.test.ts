import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockTeamFindUnique = vi.fn();
const mockSessionCreate = vi.fn();
const mockSessionFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => {
  class NoDatabaseError extends Error {
    constructor() { super("Database not configured"); this.name = "NoDatabaseError"; }
  }
  return {
    requirePrisma: vi.fn(() => ({
      team: { findUnique: mockTeamFindUnique },
      session: { create: mockSessionCreate, findFirst: mockSessionFindFirst },
    })),
    NoDatabaseError,
  };
});

vi.mock("@/lib/rateLimit", () => ({
  JOIN_RATE_LIMIT: {
    windowMs: 60_000,
    maxRequests: 10,
    lockoutThreshold: 10,
    lockoutMs: 300_000,
  },
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  recordFailure: vi.fn(),
  resetFailures: vi.fn(),
}));

import { POST } from "./route";
import { checkRateLimit, recordFailure } from "@/lib/rateLimit";

function makeRequest(body: Record<string, unknown>, ip = "127.0.0.1"): NextRequest {
  return new NextRequest("http://localhost/api/v1/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

const mockTeam = {
  id: "team-uuid",
  name: "Test Team",
  inviteCode: "BCD123",
  isActive: true,
  expiresAt: null,
  trainerId: "trainer-uuid",
  createdAt: new Date(),
  retainUntil: null,
};

const mockSession = {
  id: "session-uuid",
  teamId: "team-uuid",
  anonymousId: "anon-123",
  playerHandle: "Ghost42",
  startedAt: new Date("2026-03-10T12:00:00Z"),
  completedAt: null,
  phaseScores: {},
  totalScore: null,
  endingReached: null,
  deviceInfo: null,
};

describe("POST /api/v1/join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true });
    mockSessionFindFirst.mockResolvedValue(null);
  });

  it("returns 201 with session data for valid invite code", async () => {
    mockTeamFindUnique.mockResolvedValue(mockTeam as never);
    mockSessionCreate.mockResolvedValue(mockSession as never);

    const req = makeRequest({
      inviteCode: "BCD123",
      anonymousId: "anon-123",
      playerHandle: "Ghost42",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe("session-uuid");
    expect(json.teamId).toBe("team-uuid");
    expect(json.anonymousId).toBe("anon-123");
    expect(json.playerHandle).toBe("Ghost42");
  });

  it("returns 404 for invalid invite code", async () => {
    mockTeamFindUnique.mockResolvedValue(null);

    const req = makeRequest({
      inviteCode: "XXXXXX",
      anonymousId: "anon-123",
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/[Ii]nvalid invite code/);
  });

  it("returns 410 for expired invite code", async () => {
    const expiredTeam = {
      ...mockTeam,
      expiresAt: new Date("2025-01-01T00:00:00Z"),
    };
    mockTeamFindUnique.mockResolvedValue(expiredTeam as never);

    const req = makeRequest({
      inviteCode: "BCD123",
      anonymousId: "anon-123",
    });
    const res = await POST(req);

    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toMatch(/expired/i);
  });

  it("returns 404 for inactive team", async () => {
    const inactiveTeam = { ...mockTeam, isActive: false };
    mockTeamFindUnique.mockResolvedValue(inactiveTeam as never);

    const req = makeRequest({
      inviteCode: "BCD123",
      anonymousId: "anon-123",
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it("returns 400 when inviteCode is missing", async () => {
    const req = makeRequest({ anonymousId: "anon-123" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/required/i);
  });

  it("returns 400 when anonymousId is missing", async () => {
    const req = makeRequest({ inviteCode: "BCD123" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("uppercases invite code before lookup", async () => {
    mockTeamFindUnique.mockResolvedValue(null);

    const req = makeRequest({
      inviteCode: "bcd123",
      anonymousId: "anon-123",
    });
    await POST(req);

    expect(mockTeamFindUnique).toHaveBeenCalledWith({
      where: { inviteCode: "BCD123" },
    });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({
      allowed: false,
      retryAfterMs: 45_000,
    });

    const req = makeRequest(
      { inviteCode: "BCD123", anonymousId: "anon-123" },
      "10.0.0.99"
    );
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toMatch(/[Tt]oo many requests/);
    expect(json.retryAfterMs).toBe(45_000);
  });

  it("calls recordFailure on invalid invite code", async () => {
    mockTeamFindUnique.mockResolvedValue(null);

    const req = makeRequest(
      { inviteCode: "XXXXXX", anonymousId: "anon-123" },
      "10.0.0.100"
    );
    await POST(req);

    expect(recordFailure).toHaveBeenCalled();
  });

  it("lockout blocks subsequent requests", async () => {
    vi.mocked(checkRateLimit).mockReturnValue({
      allowed: false,
      retryAfterMs: 300_000,
    });

    const req = makeRequest(
      { inviteCode: "BCD123", anonymousId: "anon-123" },
      "10.0.0.100"
    );
    const res = await POST(req);

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.retryAfterMs).toBe(300_000);
  });
});
