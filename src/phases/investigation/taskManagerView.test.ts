import { describe, it, expect, beforeEach } from "vitest";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { LOLBINS } from "@/content/fileListings";
import type { LOLBin } from "@/content/types";

type Action = "quarantine" | "ignore";

/** Simulates handleSubmit from TaskManagerView component */
function simulateLOLBinCleanup(processes: LOLBin[], actions: Record<string, Action>) {
  const store = useScoreStore.getState();
  const narrative = useNarrativeStore.getState();

  let correctCount = 0;
  let overQuarantined = false;

  processes.forEach((proc) => {
    const action = actions[proc.id];
    const correct = proc.isMalicious
      ? action === "quarantine"
      : action === "ignore";

    if (correct) correctCount++;
    if (!proc.isMalicious && action === "quarantine") {
      overQuarantined = true;
    }
  });

  const points = Math.round((correctCount / processes.length) * 10);
  store.addAction({
    id: "lolbin-cleanup",
    category: "forensicSkill",
    points,
    maxPoints: 10,
    label: `LOLBin cleanup: ${correctCount}/${processes.length} correct`,
  });

  if (overQuarantined) {
    narrative.addFlag("over_quarantined");
    store.adjustTrust(-5);
  }
}

describe("taskManagerView LOLBin cleanup", () => {
  beforeEach(() => {
    useScoreStore.getState().reset();
    useNarrativeStore.getState().reset();
  });

  describe("LOLBin content data", () => {
    it("has 6 processes", () => {
      expect(LOLBINS).toHaveLength(6);
    });

    it("has 5 malicious and 1 legitimate process", () => {
      expect(LOLBINS.filter((p) => p.isMalicious)).toHaveLength(5);
      expect(LOLBINS.filter((p) => !p.isMalicious)).toHaveLength(1);
    });

    it("legitimate process is powershell.exe with local script", () => {
      const legit = LOLBINS.find((p) => !p.isMalicious)!;
      expect(legit.processName).toBe("powershell.exe");
      expect(legit.commandLine).toContain("DailyReport.ps1");
    });

    it("malicious processes have MITRE ATT&CK IDs", () => {
      const malicious = LOLBINS.filter((p) => p.isMalicious);
      for (const proc of malicious) {
        expect(proc.mitreId).toBeDefined();
      }
    });

    it("each process has a unique id and pid", () => {
      const ids = LOLBINS.map((p) => p.id);
      const pids = LOLBINS.map((p) => p.pid);
      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(pids).size).toBe(pids.length);
    });
  });

  describe("all correct actions", () => {
    it("scores full points (10) in forensicSkill", () => {
      const actions: Record<string, Action> = {};
      LOLBINS.forEach((p) => {
        actions[p.id] = p.isMalicious ? "quarantine" : "ignore";
      });

      simulateLOLBinCleanup(LOLBINS, actions);
      expect(useScoreStore.getState().categoryScores.forensicSkill).toBe(10);
    });

    it("does not set over_quarantined flag", () => {
      const actions: Record<string, Action> = {};
      LOLBINS.forEach((p) => {
        actions[p.id] = p.isMalicious ? "quarantine" : "ignore";
      });

      simulateLOLBinCleanup(LOLBINS, actions);
      expect(useNarrativeStore.getState().hasFlag("over_quarantined")).toBe(false);
    });
  });

  describe("quarantining legitimate process (over-quarantine)", () => {
    it("sets over_quarantined flag", () => {
      const actions: Record<string, Action> = {};
      LOLBINS.forEach((p) => {
        actions[p.id] = "quarantine"; // quarantine everything including legit
      });

      simulateLOLBinCleanup(LOLBINS, actions);
      expect(useNarrativeStore.getState().hasFlag("over_quarantined")).toBe(true);
    });

    it("penalises trust by 5", () => {
      const initial = useScoreStore.getState().trustScore;
      const actions: Record<string, Action> = {};
      LOLBINS.forEach((p) => {
        actions[p.id] = "quarantine";
      });

      simulateLOLBinCleanup(LOLBINS, actions);
      expect(useScoreStore.getState().trustScore).toBe(initial - 5);
    });
  });

  describe("ignoring all (worst case)", () => {
    it("scores partial points (only legit ignored correctly = 1/6)", () => {
      const actions: Record<string, Action> = {};
      LOLBINS.forEach((p) => {
        actions[p.id] = "ignore";
      });

      simulateLOLBinCleanup(LOLBINS, actions);
      // Only legit process is correct = 1/6 * 10 = 2
      expect(useScoreStore.getState().categoryScores.forensicSkill).toBe(
        Math.round((1 / 6) * 10)
      );
    });
  });
});
