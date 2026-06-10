"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { LOG_ENTRIES } from "@/content/logEntries";
import type { IOCIndicator } from "@/content/types";

interface IOCExtractionProps {
  onComplete: () => void;
}

const DEFAULT_IOCS: IOCIndicator[] = [
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

type Mode = "choose" | "attempt" | "opted-out";

export function IOCExtraction({ onComplete }: IOCExtractionProps) {
  const [mode, setMode] = useState<Mode>("choose");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [shownHints, setShownHints] = useState<Set<string>>(new Set());
  const [logsOpen, setLogsOpen] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const addAction = useScoreStore((s) => s.addAction);
  const addFlag = useNarrativeStore((s) => s.addFlag);

  const iocsToUse = DEFAULT_IOCS;
  const logsToUse = LOG_ENTRIES;

  const handleDeferToCSIRT = () => {
    addAction({
      id: "ioc-deferred-to-csirt",
      category: "forensicSkill",
      points: 18,
      maxPoints: 25,
      label: "Deferred IOC extraction to CSIRT (correct procedure)",
    });
    addFlag("deferred_to_csirt");
    setMode("opted-out");
  };

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
    let correct = 0;

    iocsToUse.forEach((ioc) => {
      const input = (inputs[ioc.type] || "").trim().toLowerCase();
      const expected = ioc.value.toLowerCase();
      if (input === expected || input.includes(expected)) {
        correct++;
      }
    });

    const points = Math.round((correct / iocsToUse.length) * 25);
    addAction({
      id: "ioc-extraction",
      category: "forensicSkill",
      points,
      maxPoints: 25,
      label: `IOC extraction: ${correct}/${iocsToUse.length} identified`,
    });

    if (correct === iocsToUse.length) {
      addFlag("extracted_all_iocs");
    } else if (correct < Math.ceil(iocsToUse.length / 2)) {
      addFlag("failed_ioc_extraction");
    }

    setCorrectCount(correct);
    setSubmitted(true);
  };

  if (mode === "choose") {
    return (
      <div className="p-6 max-w-lg mx-auto overflow-y-auto h-full">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          IOC Documentation
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed max-w-[60ch]">
          You've identified suspicious activity. Before documenting Indicators of Compromise,
          you need to decide how to proceed.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleDeferToCSIRT}
            className="w-full text-left p-4 border-2 border-[var(--success)] rounded-xl bg-[var(--bg-window-sunken)] hover:bg-[var(--bg-window)] transition-all group focus:outline-none focus:ring-2 focus:ring-[var(--success)]/40"
          >
            <div className="flex items-start gap-3">
              <span className="text-[var(--success)] text-lg mt-0.5">✓</span>
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">
                  Report to CSIRT
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Hand your findings to the Computer Security Incident Response Team.
                  They have forensic tools, legal authority, and chain-of-custody procedures.
                  This is the correct real-world response — freelancing IOC extraction
                  risks contaminating evidence.
                </p>
                <p className="text-xs text-[var(--success)] mt-2 font-medium">
                  +18 points — Recognised correct escalation procedure
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode("attempt")}
            className="w-full text-left p-4 border border-[var(--warning)] rounded-xl bg-[var(--bg-window-sunken)] hover:bg-[var(--bg-window)] transition-all group focus:outline-none focus:ring-2 focus:ring-[var(--warning)]/40"
          >
            <div className="flex items-start gap-3">
              <span className="text-[var(--warning)] text-lg mt-0.5">⚠</span>
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">
                  Attempt IOC extraction yourself
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Document the attacker's IP, C2 server, compromised accounts and
                  staging paths directly from the logs. Higher reward if you get it right —
                  but if you miss critical indicators, it will count against you.
                </p>
                <p className="text-xs text-[var(--warning)] mt-2 font-medium">
                  Up to +25 points — but penalty for poor accuracy
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "opted-out") {
    return (
      <div className="p-6 max-w-lg mx-auto overflow-y-auto h-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[var(--success)] text-2xl">✓</span>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              CSIRT Notified
            </h2>
          </div>

          <div className="p-4 border border-[var(--success)] rounded-xl bg-[var(--bg-window-sunken)] mb-6">
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
              You escalated correctly. A CSIRT ticket has been opened and a forensic
              analyst has been assigned. They will extract IOCs using forensically
              sound methods that preserve chain of custody.
            </p>
            <p className="text-xs text-[var(--text-muted)] italic">
              Note: In a real incident, freelancing attribution work before CSIRT is
              engaged can compromise legal proceedings and alter evidence integrity.
            </p>
          </div>

          <div className="p-3 bg-[var(--bg-window-sunken)] border border-[var(--border)] rounded-lg mb-6">
            <p className="text-xs font-mono text-[var(--success)]">
              + 18 pts — Escalation to CSIRT
            </p>
          </div>

          <button
            onClick={onComplete}
            className="w-full py-3 bg-[var(--accent)] text-white rounded-xl text-sm font-medium hover:bg-[var(--accent-hover)] transition-all duration-200 active:scale-[0.98]"
          >
            Continue
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto overflow-y-auto h-full">
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
        IOC Extraction
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-1 leading-relaxed max-w-[60ch]">
        Document Indicators of Compromise you identified from logs.
        These will be shared with SOC team and submitted to threat intelligence feeds.
      </p>
      <p className="text-xs text-[var(--warning)] mb-6">
        All 6 correct = +25 pts. Missing more than half will count against you.
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
            {logsToUse.map((entry) => (
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
        {iocsToUse.map((ioc) => (
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

      {submitted && correctCount < Math.ceil(iocsToUse.length / 2) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 border border-[var(--danger)] rounded-lg bg-[var(--bg-window-sunken)] text-xs text-[var(--danger)]"
        >
          You identified {correctCount}/{iocsToUse.length} indicators. Incomplete attribution
          has been flagged — CSIRT will need to re-do this work.
        </motion.div>
      )}

      <button
        onClick={submitted ? onComplete : handleSubmit}
        className="mt-6 w-full py-3 bg-[var(--accent)] text-white rounded-xl text-sm font-medium hover:bg-[var(--accent-hover)] transition-all duration-200 active:scale-[0.98]"
      >
        {submitted ? "Continue" : "Submit IOCs"}
      </button>
    </div>
  );
}
