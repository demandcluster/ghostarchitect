import { describe, it, expect } from "vitest";
import { LOG_ENTRIES } from "@/content/logEntries";

describe("logEntries content", () => {
  it("has 14 log entries", () => {
    expect(LOG_ENTRIES).toHaveLength(14);
  });

  it("has 10 malicious and 4 benign entries", () => {
    expect(LOG_ENTRIES.filter((e) => e.isMalicious)).toHaveLength(10);
    expect(LOG_ENTRIES.filter((e) => !e.isMalicious)).toHaveLength(4);
  });

  it("each entry has a unique id", () => {
    const ids = LOG_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("entries are in chronological order", () => {
    for (let i = 1; i < LOG_ENTRIES.length; i++) {
      expect(LOG_ENTRIES[i].timestamp >= LOG_ENTRIES[i - 1].timestamp).toBe(true);
    }
  });

  it("malicious entries have attackTechnique and mitreId", () => {
    const malicious = LOG_ENTRIES.filter((e) => e.isMalicious);
    for (const entry of malicious) {
      expect(entry.attackTechnique).toBeDefined();
      expect(entry.mitreId).toBeDefined();
      expect(entry.mitreId).toMatch(/^T\d+/);
    }
  });

  it("benign entries do not have attackTechnique", () => {
    const benign = LOG_ENTRIES.filter((e) => !e.isMalicious);
    for (const entry of benign) {
      expect(entry.attackTechnique).toBeUndefined();
    }
  });

  it("contains the expected IOCs in log messages", () => {
    const allMessages = LOG_ENTRIES.map((e) => e.message).join(" ");
    expect(allMessages).toContain("185.234.72.14"); // attacker IP
    expect(allMessages).toContain("45.33.91.200"); // C2 server
    expect(allMessages).toContain("8443"); // C2 port
    expect(allMessages).toContain("svc_backup"); // compromised account
    expect(allMessages).toContain("/tmp/.cache/data.enc"); // staging path
    expect(allMessages).toContain("gh0st-4rch1t3ct"); // exfil token
  });

  it("covers multiple MITRE ATT&CK techniques", () => {
    const techniques = new Set(
      LOG_ENTRIES.filter((e) => e.mitreId).map((e) => e.mitreId)
    );
    expect(techniques.size).toBeGreaterThanOrEqual(5);
  });

  it("includes the full attack chain: brute force -> access -> lateral -> exfil -> cleanup", () => {
    const techniques = LOG_ENTRIES.filter((e) => e.attackTechnique).map(
      (e) => e.attackTechnique!
    );
    expect(techniques.some((t) => t.includes("Brute Force"))).toBe(true);
    expect(techniques.some((t) => t.includes("Lateral Movement"))).toBe(true);
    expect(techniques.some((t) => t.includes("Exfiltration"))).toBe(true);
    expect(techniques.some((t) => t.includes("Indicator Removal"))).toBe(true);
  });
});
