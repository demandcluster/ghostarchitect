import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit, recordFailure, resetFailures } from "./rateLimit";
import type { RateLimitConfig } from "./rateLimit";

const testConfig: RateLimitConfig = {
  windowMs: 60_000,       // 1 minute
  maxRequests: 5,          // low limit for easy testing
  lockoutThreshold: 3,     // 3 consecutive failures
  lockoutMs: 300_000,      // 5 minutes
};

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("checkRateLimit", () => {
    it("allows requests under the limit", () => {
      for (let i = 0; i < testConfig.maxRequests; i++) {
        const result = checkRateLimit(`ip-under-${Date.now()}`, testConfig);
        expect(result.allowed).toBe(true);
      }
    });

    it("allows exactly maxRequests requests", () => {
      const ip = "192.168.1.1";
      for (let i = 0; i < testConfig.maxRequests; i++) {
        const result = checkRateLimit(ip, testConfig);
        expect(result.allowed).toBe(true);
      }
    });

    it("blocks requests exceeding the limit", () => {
      const ip = "192.168.1.2";
      for (let i = 0; i < testConfig.maxRequests; i++) {
        checkRateLimit(ip, testConfig);
      }
      const result = checkRateLimit(ip, testConfig);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it("provides retryAfterMs when blocked", () => {
      const ip = "192.168.1.3";
      for (let i = 0; i <= testConfig.maxRequests; i++) {
        checkRateLimit(ip, testConfig);
      }
      const result = checkRateLimit(ip, testConfig);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeDefined();
      expect(result.retryAfterMs).toBeLessThanOrEqual(testConfig.windowMs);
    });

    it("resets count after window expires", () => {
      const ip = "192.168.1.4";
      // Exhaust the limit
      for (let i = 0; i <= testConfig.maxRequests; i++) {
        checkRateLimit(ip, testConfig);
      }
      expect(checkRateLimit(ip, testConfig).allowed).toBe(false);

      // Advance past the window
      vi.advanceTimersByTime(testConfig.windowMs + 1);

      const result = checkRateLimit(ip, testConfig);
      expect(result.allowed).toBe(true);
    });

    it("tracks different IPs independently", () => {
      const ip1 = "10.0.0.1";
      const ip2 = "10.0.0.2";
      // Exhaust ip1
      for (let i = 0; i <= testConfig.maxRequests; i++) {
        checkRateLimit(ip1, testConfig);
      }
      expect(checkRateLimit(ip1, testConfig).allowed).toBe(false);
      // ip2 should still be allowed
      expect(checkRateLimit(ip2, testConfig).allowed).toBe(true);
    });
  });

  describe("lockout (recordFailure)", () => {
    it("does not lock out before reaching threshold", () => {
      const ip = "192.168.2.1";
      checkRateLimit(ip, testConfig); // initialize entry
      for (let i = 0; i < testConfig.lockoutThreshold - 1; i++) {
        recordFailure(ip, testConfig);
      }
      const result = checkRateLimit(ip, testConfig);
      expect(result.allowed).toBe(true);
    });

    it("locks out after reaching consecutive failure threshold", () => {
      const ip = "192.168.2.2";
      checkRateLimit(ip, testConfig); // initialize entry
      for (let i = 0; i < testConfig.lockoutThreshold; i++) {
        recordFailure(ip, testConfig);
      }
      const result = checkRateLimit(ip, testConfig);
      expect(result.allowed).toBe(false);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it("lockout retryAfterMs reflects lockout duration", () => {
      const ip = "192.168.2.3";
      checkRateLimit(ip, testConfig);
      for (let i = 0; i < testConfig.lockoutThreshold; i++) {
        recordFailure(ip, testConfig);
      }
      const result = checkRateLimit(ip, testConfig);
      expect(result.retryAfterMs).toBeLessThanOrEqual(testConfig.lockoutMs);
    });

    it("lockout expires after lockoutMs", () => {
      const ip = "192.168.2.4";
      checkRateLimit(ip, testConfig);
      for (let i = 0; i < testConfig.lockoutThreshold; i++) {
        recordFailure(ip, testConfig);
      }
      expect(checkRateLimit(ip, testConfig).allowed).toBe(false);

      // Advance past lockout
      vi.advanceTimersByTime(testConfig.lockoutMs + 1);

      const result = checkRateLimit(ip, testConfig);
      expect(result.allowed).toBe(true);
    });

    it("resets consecutive failures counter after lockout triggers", () => {
      const ip = "192.168.2.5";
      checkRateLimit(ip, testConfig);
      for (let i = 0; i < testConfig.lockoutThreshold; i++) {
        recordFailure(ip, testConfig);
      }
      // After lockout expires, failures should be reset
      vi.advanceTimersByTime(testConfig.lockoutMs + 1);
      checkRateLimit(ip, testConfig); // re-init window

      // Should need another full threshold of failures to lock out again
      for (let i = 0; i < testConfig.lockoutThreshold - 1; i++) {
        recordFailure(ip, testConfig);
      }
      const result = checkRateLimit(ip, testConfig);
      expect(result.allowed).toBe(true);
    });

    it("does nothing if IP has no existing entry", () => {
      // Should not throw
      expect(() => recordFailure("unknown-ip", testConfig)).not.toThrow();
    });
  });

  describe("resetFailures", () => {
    it("resets consecutive failure count", () => {
      const ip = "192.168.3.1";
      checkRateLimit(ip, testConfig);
      for (let i = 0; i < testConfig.lockoutThreshold - 1; i++) {
        recordFailure(ip, testConfig);
      }
      resetFailures(ip);
      // One more failure should not trigger lockout (counter was reset)
      recordFailure(ip, testConfig);
      const result = checkRateLimit(ip, testConfig);
      expect(result.allowed).toBe(true);
    });

    it("does nothing for unknown IP", () => {
      expect(() => resetFailures("nonexistent-ip")).not.toThrow();
    });
  });

  describe("JOIN_RATE_LIMIT config", () => {
    it("has expected production values", async () => {
      const { JOIN_RATE_LIMIT } = await import("./rateLimit");
      expect(JOIN_RATE_LIMIT.windowMs).toBe(60_000);
      expect(JOIN_RATE_LIMIT.maxRequests).toBe(10);
      expect(JOIN_RATE_LIMIT.lockoutThreshold).toBe(10);
      expect(JOIN_RATE_LIMIT.lockoutMs).toBe(300_000);
    });
  });
});
