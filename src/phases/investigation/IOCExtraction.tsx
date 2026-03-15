"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { LOG_ENTRIES } from "@/content/logEntries";

interface IOCExtractionProps {
  onComplete: () => void;
}

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

const LEVEL_COLORS: Record<string, string> = {
  INFO: "text-[var(--info)]",
  WARN: "text-[var(--warning)]",
  ERROR: "text-[var(--danger)]",
  CRITICAL: "text-[var(--danger)]",
};

export function IOCExtraction({ onComplete }: IOCExtractionProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [shownHints, setShownHints] = useState<Set<string>>(new Set());
  const [logsOpen, setLogsOpen] = useState(false);
  const addAction = useScoreStore((s) => s.addAction);
  const addFlag = useNarrativeStore((s) => s.addFlag);

  const showHint = (iocType: string) => {
    setShownHints((prev) => new Set(prev).add(iocType));
    addAction({
      id: `ioc-hint-${iocType}`,
      category: "forensicSkill",
      points: -3,
      maxPoints: 0,
      label: `Used hint: ${iocType}`,
    });
  };

  const handleSubmit = () => {
    let correctCount = 0;

    EXPECTED_IOCS.forEach((ioc) => {
      const input = (inputs[ioc.type] || "").trim().toLowerCase();
      const expected = ioc.value.toLowerCase();
      if (input === expected || input.includes(expected)) {
        correctCount++;
      }
    });

    const points = Math.round((correctCount / 6) * 25);
    addAction({
      id: "ioc-extraction",
      category: "forensicSkill",
      points,
      maxPoints: 25,
      label: `IOC extraction: ${correctCount}/${EXPECTED_IOCS.length} identified`,
    });

    if (correctCount === EXPECTED_IOCS.length) {
      addFlag("extracted_all_iocs");
    }

    setSubmitted(true);
  };

  return (
    <div className="p-6 max-w-lg mx-auto overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-text-primary mb-2">
        IOC Extraction
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Document the Indicators of Compromise you identified from the logs.
        These will be shared with the SOC team and submitted to threat
        intelligence feeds.
      </p>

      {/* Reference Logs Panel */}
      <div className="mb-6 border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => setLogsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 bg-bg-secondary text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <span>Reference Logs</span>
          <span>{logsOpen ? "\u25B4" : "\u25BE"}</span>
        </button>
        {logsOpen && (
          <div className="max-h-48 overflow-auto bg-[var(--bg-window)] p-2">
            {LOG_ENTRIES.map((entry) => (
              <div
                key={entry.id}
                className="font-mono text-[11px] leading-relaxed"
              >
                <span className="text-text-muted">{entry.timestamp}</span>{" "}
                <span className={LEVEL_COLORS[entry.level] || "text-text-muted"}>
                  [{entry.level}]
                </span>{" "}
                <span className="text-[var(--accent-cyan,var(--info))]">{entry.source}</span>{" "}
                <span className="text-[var(--text-primary)]">{entry.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {EXPECTED_IOCS.map((ioc) => (
          <div key={ioc.type}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-text-secondary">
                {ioc.type}
              </label>
              {!submitted && !shownHints.has(ioc.type) && (
                <button
                  onClick={() => showHint(ioc.type)}
                  className="text-[10px] text-amber-500 hover:text-amber-400 transition-colors"
                >
                  Show Hint (-3pt)
                </button>
              )}
            </div>
            {shownHints.has(ioc.type) && (
              <p className="text-[11px] text-text-muted mb-1 italic">
                Hint: {ioc.hint}
              </p>
            )}
            <input
              type="text"
              value={inputs[ioc.type] || ""}
              onChange={(e) =>
                setInputs((prev) => ({
                  ...prev,
                  [ioc.type]: e.target.value,
                }))
              }
              disabled={submitted}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-sm font-mono text-text-primary focus:outline-none focus:border-accent"
              placeholder={`Enter ${ioc.type.toLowerCase()}`}
            />
            {submitted && (
              <div className="mt-1 text-[11px]">
                {(inputs[ioc.type] || "")
                  .trim()
                  .toLowerCase()
                  .includes(ioc.value.toLowerCase()) ? (
                  <span className="text-[var(--success)]">
                    Correct
                  </span>
                ) : (
                  <span className="text-[var(--danger)]">
                    Expected: <span className="font-mono">{ioc.value}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={submitted ? onComplete : handleSubmit}
        className="mt-6 w-full py-2 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors"
      >
        {submitted ? "Continue" : "Submit IOCs"}
      </button>
    </div>
  );
}
