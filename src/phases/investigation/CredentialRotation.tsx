"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
    description: "Change the compromised service account password",
    isCorrect: true,
  },
  {
    id: "revoke-sessions",
    label: "Revoke active sessions for svc_backup",
    description: "Force logout all active sessions for the compromised account",
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
    description: "Look for scheduled tasks, registry keys, or cron jobs the attacker may have created",
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
    description: "Escalate to leadership and start the regulatory notification timeline",
    isCorrect: true,
  },
];

export function CredentialRotation({ onComplete }: CredentialRotationProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const addAction = useScoreStore((s) => s.addAction);
  const addFlag = useNarrativeStore((s) => s.addFlag);

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
    <div className="p-6 max-w-lg mx-auto overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-text-primary mb-2">
        Post-Breach Response
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Select all the appropriate post-breach actions. Be careful — some
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
                w-full p-3 rounded-lg border text-left transition-colors
                ${
                  showResult
                    ? correct
                      ? "border-[var(--success)]/35"
                      : "border-[var(--danger)]/35"
                    : isSelected
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent"
                }
              `}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                    isSelected
                      ? "bg-accent border-accent text-white"
                      : "border-border"
                  }`}
                >
                  {isSelected && "x"}
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {step.label}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1 ml-6">
                {step.description}
              </p>
              {showResult && !correct && (
                <p className="text-[11px] text-[var(--danger)] mt-1 ml-6">
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
        className="mt-6 w-full py-2 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {submitted ? "Continue to Debrief" : "Submit"}
      </button>
    </div>
  );
}
