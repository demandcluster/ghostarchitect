"use client";

import { useState } from "react";
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
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
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
                  <span className="font-mono text-sm text-[var(--text-primary)]">
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
                <p className="text-xs text-[var(--text-secondary)] mt-1">
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
          className="mt-4 px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl text-sm font-medium hover:bg-[var(--accent-hover)] transition-all duration-200 active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Process list */}
      <div className="w-[45%] border-r border overflow-auto">
        <div className="grid grid-cols-[1fr_60px_auto] text-[11px] font-semibold text-[var(--text-muted)] px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-window-sunken)] uppercase tracking-wide">
          <span>Process Name</span>
          <span>PID</span>
          <span>Action</span>
        </div>
        {processes.map((proc) => (
          <div
            key={proc.id}
            onClick={() => setSelectedPid(proc.pid)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedPid(proc.pid);
              }
            }}
            tabIndex={0}
            role="button"
            className={`
              grid grid-cols-[1fr_60px_auto] items-center px-3 py-2.5 text-sm border-b border cursor-pointer
              ${selectedPid === proc.pid ? "bg-[var(--accent-subtle)]" : "hover:bg-[var(--bg-window-sunken)]"}
              transition-colors duration-150
            `}
          >
            <span className="font-mono text-[var(--text-primary)]">
              {proc.processName}
            </span>
            <span className="font-mono text-muted tabular-nums">{proc.pid}</span>
            <div className="flex gap-1">
              {(["quarantine", "ignore"] as Action[]).map((act) => (
                <button
                  key={act}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(proc, act);
                  }}
                  className={`
                    px-2 py-1 rounded text-[11px] font-medium border transition-all
                    ${
                      actions[proc.id] === act
                        ? act === "quarantine"
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-green-600 text-white border-green-600"
                        : "border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
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
              className="w-full py-2.5 bg-[var(--accent)] text-white rounded-xl text-xs font-medium hover:bg-[var(--accent-hover)] transition-all duration-200 active:scale-[0.98]"
            >
              Submit Decisions
            </button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="w-[55%] overflow-auto p-5">
        {selected ? (
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
              {selected.processName}
            </h3>
            <div className="text-sm text-muted mb-4">
              PID: <span className="font-mono tabular-nums">{selected.pid}</span>
            </div>
            <div className="mb-5">
              <div className="text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                Command Line:
              </div>
              <div className="p-3 bg-[#0d1117] rounded-lg font-mono text-xs text-[#c9d1d9] break-all leading-relaxed border border-[#30363d]">
                {selected.commandLine}
              </div>
            </div>
            <p className="text-sm text-muted italic leading-relaxed">
              Examine the command line carefully. Legitimate system tools can be
              abused by attackers (Living-off-the-Land Binaries).
            </p>
          </div>
        ) : (
          <div className="text-sm text-muted">
            Select a process to view its command line details.
          </div>
        )}
      </div>
    </div>
  );
}
