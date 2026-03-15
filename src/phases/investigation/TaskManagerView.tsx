"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LOLBin } from "@/content/types";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";

interface TaskManagerViewProps {
  processes: LOLBin[];
  onComplete: () => void;
}

type Action = "quarantine" | "ignore";

export function TaskManagerView({
  processes,
  onComplete,
}: TaskManagerViewProps) {
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [actions, setActions] = useState<Record<string, Action>>({});
  const [showResults, setShowResults] = useState(false);
  const addAction = useScoreStore((s) => s.addAction);
  const adjustTrust = useScoreStore((s) => s.adjustTrust);
  const addFlag = useNarrativeStore((s) => s.addFlag);

  const selected = processes.find((p) => p.pid === selectedPid);
  const allActioned = processes.every((p) => actions[p.id]);

  const handleAction = (proc: LOLBin, action: Action) => {
    setActions((a) => ({ ...a, [proc.id]: action }));
  };

  const handleSubmit = () => {
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

    const points = Math.round((correctCount / processes.length) * 50);
    addAction({
      id: "lolbin-cleanup",
      category: "forensicSkill",
      points,
      maxPoints: 50,
      label: `LOLBin cleanup: ${correctCount}/${processes.length} correct`,
    });

    if (overQuarantined) {
      addFlag("over_quarantined");
      adjustTrust(-15);
    }

    setShowResults(true);
  };

  if (showResults) {
    return (
      <div className="p-6 overflow-auto h-full">
        <h2 className="text-lg font-bold text-text-primary mb-4">
          Malware Cleanup Results
        </h2>
        <div className="space-y-3">
          {processes.map((proc) => {
            const action = actions[proc.id];
            const correct = proc.isMalicious
              ? action === "quarantine"
              : action === "ignore";

            return (
              <div
                key={proc.id}
                className={`p-3 rounded-lg border ${
                  correct
                    ? "border-[rgba(22,163,74,0.35)]"
                    : "border-[rgba(220,38,38,0.35)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-text-primary">
                    {proc.processName} (PID {proc.pid})
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded ${
                      correct
                        ? "bg-[rgba(22,163,74,0.12)] text-[#22c55e]"
                        : "bg-[rgba(220,38,38,0.12)] text-[#ef4444]"
                    }`}
                  >
                    {correct ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {proc.description}
                </p>
                {proc.mitreId && (
                  <span className="text-[10px] text-accent font-mono">
                    MITRE: {proc.mitreId}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={onComplete}
          className="mt-4 px-6 py-2 bg-accent text-white rounded text-sm hover:bg-accent-hover transition-colors"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Process list */}
      <div className="w-[45%] border-r border-border overflow-auto">
        <div className="grid grid-cols-[1fr_60px_auto] text-[10px] font-medium text-text-muted px-3 py-2 border-b border-border bg-bg-secondary">
          <span>Process Name</span>
          <span>PID</span>
          <span>Action</span>
        </div>
        {processes.map((proc) => (
          <div
            key={proc.id}
            onClick={() => setSelectedPid(proc.pid)}
            className={`
              grid grid-cols-[1fr_60px_auto] items-center px-3 py-2 text-xs border-b border-border cursor-pointer
              ${selectedPid === proc.pid ? "bg-accent/10" : "hover:bg-bg-secondary"}
            `}
          >
            <span className="font-mono text-text-primary">
              {proc.processName}
            </span>
            <span className="font-mono text-text-muted">{proc.pid}</span>
            <div className="flex gap-1">
              {(["quarantine", "ignore"] as Action[]).map((act) => (
                <button
                  key={act}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(proc, act);
                  }}
                  className={`
                    px-2 py-0.5 rounded text-[10px] border transition-colors
                    ${
                      actions[proc.id] === act
                        ? act === "quarantine"
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-green-600 text-white border-green-600"
                        : "border-border text-text-secondary hover:border-accent"
                    }
                  `}
                >
                  {act === "quarantine" ? "Quarantine" : "Ignore"}
                </button>
              ))}
            </div>
          </div>
        ))}

        {allActioned && (
          <div className="p-3">
            <button
              onClick={handleSubmit}
              className="w-full py-2 bg-accent text-white rounded text-xs font-medium hover:bg-accent-hover"
            >
              Submit Decisions
            </button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="w-[55%] overflow-auto p-4">
        {selected ? (
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-2">
              {selected.processName}
            </h3>
            <div className="text-xs text-text-muted mb-3">
              PID: {selected.pid}
            </div>
            <div className="mb-4">
              <div className="text-[10px] font-medium text-text-secondary mb-1">
                Command Line:
              </div>
              <div className="p-3 bg-[#0d1117] rounded font-mono text-xs text-[#c9d1d9] break-all leading-relaxed">
                {selected.commandLine}
              </div>
            </div>
            <p className="text-xs text-text-muted italic">
              Examine the command line carefully. Legitimate system tools can be
              abused by attackers (Living-off-the-Land Binaries).
            </p>
          </div>
        ) : (
          <div className="text-sm text-text-muted">
            Select a process to view its command line details.
          </div>
        )}
      </div>
    </div>
  );
}
