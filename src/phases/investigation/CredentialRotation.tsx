"use client";

import { useState, useEffect, useRef } from "react";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";

interface CredentialRotationProps {
  onComplete: () => void;
}

interface RotationStep {
  id: string;
  label: string;
  description: string;
  isCorrect: boolean;
}

const STEPS: RotationStep[] = [
  {
    id: "reset-svc",
    label: "Reset svc_backup password",
    description: "Change compromised service account password",
    isCorrect: true,
  },
  {
    id: "revoke-sessions",
    label: "Revoke active sessions for svc_backup",
    description: "Force logout all active sessions for compromised account",
    isCorrect: true,
  },
  {
    id: "audit-access",
    label: "Audit svc_backup access permissions",
    description: "Review what resources this account can access and revoke unnecessary privileges",
    isCorrect: true,
  },
  {
    id: "check-persistence",
    label: "Check for persistence mechanisms",
    description: "Look for scheduled tasks, registry keys, or cron jobs attacker may have created",
    isCorrect: true,
  },
  {
    id: "mass-reset",
    label: "Force company-wide password reset",
    description: "Reset all employee passwords immediately",
    isCorrect: false,
  },
  {
    id: "notify-ciso",
    label: "Notify CISO and Legal (GDPR 72-hour clock)",
    description: "Escalate to leadership and start regulatory notification timeline",
    isCorrect: true,
  },
];

export function CredentialRotation({ onComplete }: CredentialRotationProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const addAction = useScoreStore((s) => s.addAction);
  const addFlag = useNarrativeStore((s) => s.addFlag);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const toggle = (id: string) => {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    const correctSteps = STEPS.filter((s) => s.isCorrect);
    const selectedCorrect = correctSteps.filter((s) => selected.has(s.id)).length;
    const selectedWrong = STEPS.filter(
      (s) => !s.isCorrect && selected.has(s.id)
    ).length;

    const points = Math.max(
      0,
      Math.round(((selectedCorrect - selectedWrong) / 5) * 25)
    );

    addAction({
      id: "credential-rotation",
      category: "forensicSkill",
      points,
      maxPoints: 25,
      label: `Post-breach actions: ${selectedCorrect}/${correctSteps.length} correct steps`,
    });

    if (selectedCorrect === correctSteps.length && selectedWrong === 0) {
      addFlag("rotated_credentials");
    }

    if (selected.has("notify-ciso")) {
      addFlag("escalated_in_time");
    }

    setSubmitted(true);
  };

  return (
    <div ref={containerRef} className="overflow-auto h-full">
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
        Post-Breach Response
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
        Select all appropriate post-breach actions. Be careful — some
        actions could make things worse.
      </p>

      <div className="space-y-2">
        {STEPS.map((step) => {
          const isSelected = selected.has(step.id);
          const showResult = submitted;
          const correct = step.isCorrect === isSelected;

          return (
            <button
              key={step.id}
              onClick={() => toggle(step.id)}
              disabled={submitted}
              className={`
                w-full p-3 rounded-xl border text-left transition-all duration-200
                ${
                  showResult
                    ? correct
                      ? "border-[var(--success)]/35 bg-[var(--success-subtle)]"
                      : "border-[var(--danger)]/35 bg-[var(--danger-subtle)]"
                    : isSelected
                      ? "border-[var(--accent)] bg-[var(--accent-subtle)]"
                      : "border-[var(--border)] hover:border-[var(--accent)]"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] transition-colors ${
                    isSelected
                      ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                      : "border-[var(--border)]"
                  }`}
                >
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 5l3 3 4-4" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {step.label}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1 ml-8 leading-relaxed">
                {step.description}
              </p>
              {showResult && !correct && (
                <p className="text-[11px] text-[var(--danger)] mt-2 ml-8">
                  {step.isCorrect
                    ? "You should have selected this step."
                    : "A mass reset would tip off the attacker and cause panic. Use targeted rotation instead."}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={submitted ? onComplete : handleSubmit}
        disabled={!submitted && selected.size === 0}
        className="mt-6 w-full py-3 bg-[var(--accent)] text-white rounded-xl text-sm font-medium hover:bg-[var(--accent-hover)] transition-all duration-200 active:scale-[0.98)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitted ? "Continue to Debrief" : "Submit"}
      </button>
    </div>
    </div>
  );
}
