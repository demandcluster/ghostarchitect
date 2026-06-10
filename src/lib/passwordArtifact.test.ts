import { describe, it, expect } from "vitest";
import {
  computeEntropy,
  crackTime,
  maskPassword,
  createPasswordArtifact,
  verifyPasswordArtifact,
  parsePasswordArtifact,
} from "./passwordArtifact";

describe("passwordArtifact", () => {
  describe("maskPassword", () => {
    it("keeps first and last character", () => {
      expect(maskPassword("Secret123")).toBe("S•••••••3");
    });

    it("fully masks 1-2 char passwords", () => {
      expect(maskPassword("a")).toBe("•");
      expect(maskPassword("ab")).toBe("••");
    });
  });

  describe("computeEntropy", () => {
    it("returns 0 for empty string", () => {
      expect(computeEntropy("")).toBe(0);
    });

    it("scores mixed-charset passwords higher than lowercase-only of same length", () => {
      expect(computeEntropy("Abc123!x")).toBeGreaterThan(computeEntropy("abcdefgh"));
    });
  });

  describe("crackTime", () => {
    it("returns instant for low entropy", () => {
      expect(crackTime(10)).toBe("instant");
    });

    it("returns large units for high entropy", () => {
      expect(crackTime(100)).toMatch(/years/);
    });
  });

  describe("create + verify roundtrip", () => {
    it("verifies the original password", async () => {
      const artifact = await createPasswordArtifact("Correct-Horse-42!");
      expect(await verifyPasswordArtifact("Correct-Horse-42!", artifact)).toBe(true);
    });

    it("rejects a different password", async () => {
      const artifact = await createPasswordArtifact("Correct-Horse-42!");
      expect(await verifyPasswordArtifact("wrong-guess", artifact)).toBe(false);
    });

    it("never contains the raw password", async () => {
      const pw = "SuperSecretValue99";
      const artifact = await createPasswordArtifact(pw);
      expect(JSON.stringify(artifact)).not.toContain(pw);
    });

    it("uses a fresh salt per artifact (same password, different hashes)", async () => {
      const a = await createPasswordArtifact("same-password");
      const b = await createPasswordArtifact("same-password");
      expect(a.salt).not.toBe(b.salt);
      expect(a.hash).not.toBe(b.hash);
    });

    it("captures mask, length and entropy", async () => {
      const artifact = await createPasswordArtifact("Secret123");
      expect(artifact.mask).toBe("S•••••••3");
      expect(artifact.length).toBe(9);
      expect(artifact.entropy).toBe(computeEntropy("Secret123"));
    });
  });

  describe("parsePasswordArtifact", () => {
    it("roundtrips through JSON", async () => {
      const artifact = await createPasswordArtifact("Secret123");
      const parsed = parsePasswordArtifact(JSON.stringify(artifact));
      expect(parsed).toEqual(artifact);
    });

    it("returns null for missing or corrupt input", () => {
      expect(parsePasswordArtifact(undefined)).toBeNull();
      expect(parsePasswordArtifact(null)).toBeNull();
      expect(parsePasswordArtifact("")).toBeNull();
      expect(parsePasswordArtifact("not json")).toBeNull();
      expect(parsePasswordArtifact('{"foo":1}')).toBeNull();
    });
  });
});
