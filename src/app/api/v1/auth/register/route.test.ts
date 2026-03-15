import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockTrainerFindUnique = vi.fn();
const mockTrainerCreate = vi.fn();

vi.mock("@/lib/prisma", () => {
  class NoDatabaseError extends Error {
    constructor() { super("Database not configured"); this.name = "NoDatabaseError"; }
  }
  return {
    requirePrisma: vi.fn(() => ({
      trainer: {
        findUnique: mockTrainerFindUnique,
        create: mockTrainerCreate,
      },
    })),
    NoDatabaseError,
  };
});

vi.mock("@/lib/jwt", () => ({
  signAccessToken: vi.fn().mockResolvedValue("mock-access-token"),
  signRefreshToken: vi.fn().mockResolvedValue("mock-refresh-token"),
}));

vi.mock("@/lib/auth", () => ({
  setRefreshCookie: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("$2a$12$hashed-password"),
}));

import { POST } from "./route";
import { signAccessToken } from "@/lib/jwt";
import { setRefreshCookie } from "@/lib/auth";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockTrainer = {
  id: "trainer-uuid",
  username: "trainer1",
  passwordHash: "$2a$12$hashed-password",
  createdAt: new Date(),
};

describe("POST /api/v1/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a trainer and returns 201 with accessToken", async () => {
    mockTrainerFindUnique.mockResolvedValue(null);
    mockTrainerCreate.mockResolvedValue(mockTrainer as never);

    const req = makeRequest({
      username: "trainer1",
      password: "secureP@ss1",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe("trainer-uuid");
    expect(json.username).toBe("trainer1");
    expect(json.accessToken).toBe("mock-access-token");
    // Password hash should NOT be in the response
    expect(json.passwordHash).toBeUndefined();
  });

  it("calls signAccessToken with trainer id and email", async () => {
    mockTrainerFindUnique.mockResolvedValue(null);
    mockTrainerCreate.mockResolvedValue(mockTrainer as never);

    const req = makeRequest({
      username: "trainer1",
      password: "secureP@ss1",
    });
    await POST(req);

    expect(signAccessToken).toHaveBeenCalledWith("trainer-uuid", "trainer1");
  });

  it("sets HttpOnly refresh cookie", async () => {
    mockTrainerFindUnique.mockResolvedValue(null);
    mockTrainerCreate.mockResolvedValue(mockTrainer as never);

    const req = makeRequest({
      username: "trainer1",
      password: "secureP@ss1",
    });
    await POST(req);

    expect(setRefreshCookie).toHaveBeenCalledTimes(1);
    expect(setRefreshCookie).toHaveBeenCalledWith(
      expect.anything(),
      "mock-refresh-token"
    );
  });

  it("rejects duplicate email with 409", async () => {
    mockTrainerFindUnique.mockResolvedValue(mockTrainer as never);

    const req = makeRequest({
      username: "trainer1",
      password: "secureP@ss1",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toMatch(/already taken/i);
  });

  it("returns 400 when username is missing", async () => {
    const req = makeRequest({ password: "secureP@ss1" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/required/i);
  });

  it("returns 400 when password is missing", async () => {
    const req = makeRequest({ username: "trainer1" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when password is too short", async () => {
    const req = makeRequest({
      username: "trainer1",
      password: "short",
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/at least 8/i);
  });

  it("hashes password with bcrypt cost 12", async () => {
    mockTrainerFindUnique.mockResolvedValue(null);
    mockTrainerCreate.mockResolvedValue(mockTrainer as never);

    const req = makeRequest({
      username: "trainer1",
      password: "secureP@ss1",
    });
    await POST(req);

    const bcryptjs = await import("bcryptjs");
    expect(bcryptjs.hash).toHaveBeenCalledWith("secureP@ss1", 12);
  });

  it("does not create trainer if username already exists", async () => {
    mockTrainerFindUnique.mockResolvedValue(mockTrainer as never);

    const req = makeRequest({
      username: "trainer1",
      password: "secureP@ss1",
    });
    await POST(req);

    expect(mockTrainerCreate).not.toHaveBeenCalled();
  });
});
