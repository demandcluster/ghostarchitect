"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";

interface ContainmentDecisionProps {
  onComplete: () => void;
}

export function ContainmentDecision({ onComplete }: ContainmentDecisionProps) {
  const [choice, setChoice] = useState<"isolate" | "monitor" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const addAction = useScoreStore((s) => s.addAction);
  const adjustTrust = useScoreStore((s) => s.adjustTrust);
  const setDecision = useNarrativeStore((s) => s.setDecision);
  const addFlag = useNarrativeStore((s) => s.addFlag);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [choice]);

  const handleChoice = (option: "isolate" | "monitor") => {
    setChoice(option);
    setDecision("containment", option);

    if (option === "isolate") {
      addFlag("contained_quickly");
      addAction({
        id: "containment-isolate",
        category: "forensicSkill",
        points: 25,
        maxPoints: 25,
        label: "Isolated compromised systems immediately",
      });
      adjustTrust(25);
    } else {
      addAction({
        id: "containment-monitor",
        category: "forensicSkill",
        points: 10,
        maxPoints: 25,
        label: "Kept systems connected to monitor attacker",
      });
      adjustTrust(-15);
    }
  };

  return (
    <div ref={containerRef} className="overflow-auto h-full">
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
        Containment Decision
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
        The attacker has compromised svc_backup and is actively exfiltrating
        data. You need to decide now:
      </p>

      {!choice ? (
        <div className="space-y-3">
          <button
            onClick={() => handleChoice("isolate")}
            className="w-full p-4 border border-[var(--border)] rounded-xl text-left hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-all duration-200"
          >
            <div className="font-medium text-sm text-[var(--text-primary)]">
              Isolate Immediately
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              Disconnect affected systems from network. Stops exfiltration
              but may lose volatile memory evidence and alert attacker.
            </p>
          </button>

          <button
            onClick={() => handleChoice("monitor")}
            className="w-full p-4 border border-[var(--border)] rounded-xl text-left hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-all duration-200"
          >
            <div className="font-medium text-sm text-[var(--text-primary)]">
              Keep Connected to Monitor
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              Continue monitoring to gather more intelligence on attacker.
              Risk: deeper compromise, more data exfiltrated.
            </p>
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div
            className={`p-4 rounded-xl border ${
              choice === "isolate"
                ? "bg-[var(--success-subtle)] border-[var(--success)]/35"
                : "bg-[var(--warning-subtle)] border-[var(--warning)]/35"
            }`}
          >
            {choice === "isolate" ? (
              <>
                <p className="text-sm font-medium text-[var(--success)]">
                  Correct — isolate first.
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  With active exfiltration confirmed, containment takes priority.
                  Volatile memory can be captured during isolation. NIST SP
                  800-61r2 recommends immediate containment when data loss is
                  ongoing.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-[var(--warning)]">
                  Risky choice — attacker is actively exfiltrating data.
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  While monitoring can provide intelligence, every minute of
                  delay means more data leaving network. With confirmed
                  exfiltration, priority is stopping data loss. The
                  attacker may also detect your monitoring and pivot to
                  destructive actions.
                </p>
              </>
            )}
          </div>

          <button
            onClick={onComplete}
            className="w-full py-3 bg-[var(--accent)] text-white rounded-xl text-sm font-medium hover:bg-[var(--accent-hover)] transition-all duration-200 active:scale-[0.98]"
          >
            Continue
          </button>
        </motion.div>
      )}
    </div>
    </div>
  );
}
