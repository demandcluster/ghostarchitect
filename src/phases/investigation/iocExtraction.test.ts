import { describe, it, expect, beforeEach } from "vitest";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";

interface IOC {
  type: string;
  value: string;
  hint: string;
}

const EXPECTED_IOCS: IOC[] = [
  { type: "Attacker IP", value: "185.234.72.14", hint: "Source of SSH brute force" },
  { type: "C2 Server", value: "45.33.91.200", hint: "Payload download and data exfiltration destination" },
  { type: "C2 Port", value: "8443", hint: "Port used for data upload" },
  { type: "Compromised Account", value: "svc_backup", hint: "Service account used for lateral movement" },
  { type: "Staging Path", value: "/tmp/.cache/data.enc", hint: "Encrypted exfiltration payload location" },
  { type: "Exfiltration Token", value: "gh0st-4rch1t3ct", hint: "X-Token header in C2 upload" },
];

/** Simulates handleSubmit from IOCExtraction component */
function simulateIOCSubmit(inputs: Record<string, string>) {
  const store = useScoreStore.getState();
  const narrative = useNarrativeStore.getState();

  let correctCount = 0;
  EXPECTED_IOCS.forEach((ioc) => {
    const input = (inputs[ioc.type] || "").trim().toLowerCase();
    const expected = ioc.value.toLowerCase();
    if (input === expected || input.includes(expected)) {
      correctCount++;
    }
  });

  const points = Math.round((correctCount / EXPECTED_IOCS.length) * 5);
  store.addAction({
    id: "ioc-extraction",
    category: "forensicSkill",
    points,
    maxPoints: 5,
    label: `IOC extraction: ${correctCount}/${EXPECTED_IOCS.length} identified`,
  });

  if (correctCount === EXPECTED_IOCS.length) {
    narrative.addFlag("extracted_all_iocs");
  }
}

describe("iocExtraction", () => {
  beforeEach(() => {
    useScoreStore.getState().reset();
    useNarrativeStore.getState().reset();
  });

  describe("IOC data", () => {
    it("has 6 expected IOCs", () => {
      expect(EXPECTED_IOCS).toHaveLength(6);
    });

    it("includes attacker IP, C2 server, C2 port, compromised account, staging path, exfil token", () => {
      const types = EXPECTED_IOCS.map((i) => i.type);
      expect(types).toContain("Attacker IP");
      expect(types).toContain("C2 Server");
      expect(types).toContain("C2 Port");
      expect(types).toContain("Compromised Account");
      expect(types).toContain("Staging Path");
      expect(types).toContain("Exfiltration Token");
    });
  });

  describe("all IOCs correct", () => {
    it("scores full forensicSkill points (5)", () => {
      const inputs: Record<string, string> = {};
      EXPECTED_IOCS.forEach((ioc) => { inputs[ioc.type] = ioc.value; });

      simulateIOCSubmit(inputs);
      expect(useScoreStore.getState().categoryScores.forensicSkill).toBe(5);
    });

    it("sets extracted_all_iocs flag", () => {
      const inputs: Record<string, string> = {};
      EXPECTED_IOCS.forEach((ioc) => { inputs[ioc.type] = ioc.value; });

      simulateIOCSubmit(inputs);
      expect(useNarrativeStore.getState().hasFlag("extracted_all_iocs")).toBe(true);
    });
  });

  describe("partial IOCs", () => {
    it("3 of 6 correct scores ~2-3 points", () => {
      const inputs: Record<string, string> = {
        "Attacker IP": "185.234.72.14",
        "C2 Server": "45.33.91.200",
        "C2 Port": "8443",
      };

      simulateIOCSubmit(inputs);
      const score = useScoreStore.getState().categoryScores.forensicSkill;
      expect(score).toBe(Math.round((3 / 6) * 5)); // 3
    });

    it("does not set extracted_all_iocs flag", () => {
      simulateIOCSubmit({ "Attacker IP": "185.234.72.14" });
      expect(useNarrativeStore.getState().hasFlag("extracted_all_iocs")).toBe(false);
    });
  });

  describe("no IOCs", () => {
    it("scores 0 points", () => {
      simulateIOCSubmit({});
      expect(useScoreStore.getState().categoryScores.forensicSkill).toBe(0);
    });
  });

  describe("case-insensitive matching", () => {
    it("accepts uppercase input", () => {
      const inputs: Record<string, string> = {};
      EXPECTED_IOCS.forEach((ioc) => { inputs[ioc.type] = ioc.value.toUpperCase(); });

      simulateIOCSubmit(inputs);
      expect(useScoreStore.getState().categoryScores.forensicSkill).toBe(5);
      expect(useNarrativeStore.getState().hasFlag("extracted_all_iocs")).toBe(true);
    });
  });

  describe("substring matching", () => {
    it("accepts value embedded in longer text", () => {
      simulateIOCSubmit({
        "Attacker IP": "Source IP: 185.234.72.14 (external)",
        "C2 Server": "45.33.91.200",
        "C2 Port": "8443",
        "Compromised Account": "svc_backup",
        "Staging Path": "/tmp/.cache/data.enc",
        "Exfiltration Token": "gh0st-4rch1t3ct",
      });
      expect(useScoreStore.getState().categoryScores.forensicSkill).toBe(5);
    });
  });
});
