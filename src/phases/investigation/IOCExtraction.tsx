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
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
        IOC Extraction
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-7 leading-relaxed max-w-[60ch]">
        Document Indicators of Compromise you identified from logs.
        These will be shared with SOC team and submitted to threat
        intelligence feeds.
      </p>

      {/* Reference Logs Panel */}
      <div className="mb-6 border border-[var(--border)] rounded-xl overflow-hidden">
        <button
          onClick={() => setLogsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-window-sunken)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
        >
          <span>Reference Logs</span>
          <motion.span
            animate={{ rotate: logsOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▼
          </motion.span>
        </button>
        <motion.div
          initial={false}
          animate={{ height: logsOpen ? "auto" : 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="max-h-48 overflow-auto bg-[var(--bg-window)] p-4">
            {LOG_ENTRIES.map((entry) => (
              <div
                key={entry.id}
                className="font-mono text-xs leading-relaxed mb-3 last:mb-0"
              >
                <span className="text-[var(--text-muted)]">{entry.timestamp}</span>{" "}
                <span className={LEVEL_COLORS[entry.level] || "text-[var(--text-muted)]"}>
                  [{entry.level}]
                </span>{" "}
                <span className="text-[var(--accent-cyan,var(--info))]">{entry.source}</span>{" "}
                <span className="text-[var(--text-primary)]">{entry.message}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="space-y-4">
        {EXPECTED_IOCS.map((ioc) => (
          <div key={ioc.type}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-[var(--text-secondary)]" htmlFor={`ioc-${ioc.type}`}>
                {ioc.type}
              </label>
              {!submitted && !shownHints.has(ioc.type) && (
                <button
                  onClick={() => showHint(ioc.type)}
                  className="text-xs text-[var(--warning)] hover:text-[var(--warning)] transition-colors focus:outline-none focus:underline"
                >
                  Show Hint (-3pt)
                </button>
              )}
            </div>
            {shownHints.has(ioc.type) && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-xs text-[var(--text-muted)] mb-2 italic"
              >
                Hint: {ioc.hint}
              </motion.p>
            )}
            <input
              id={`ioc-${ioc.type}`}
              type="text"
              value={inputs[ioc.type] || ""}
              onChange={(e) =>
                setInputs((prev) => ({
                  ...prev,
                  [ioc.type]: e.target.value,
                }))
              }
              disabled={submitted}
              className="w-full px-4 py-2.5 bg-[var(--bg-window-sunken)] border border-[var(--border)] rounded-xl text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(59,110,248,0.2)] focus:bg-[var(--bg-window)] transition-all disabled:opacity-60"
              placeholder={`Enter ${ioc.type.toLowerCase()}`}
            />
            {submitted && (
              <div className="mt-2 text-xs">
                {(inputs[ioc.type] || "")
                  .trim()
                  .toLowerCase()
                  .includes(ioc.value.toLowerCase()) ? (
                  <span className="text-[var(--success)] flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 7l3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Correct
                  </span>
                ) : (
                  <span className="text-[var(--danger)] flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 3l-9 9" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M11 12l-9-9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
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
        className="mt-6 w-full py-3 bg-[var(--accent)] text-white rounded-xl text-sm font-medium hover:bg-[var(--accent-hover)] transition-all duration-200 active:scale-[0.98]"
      >
        {submitted ? "Continue" : "Submit IOCs"}
      </button>
    </div>
  );
}
