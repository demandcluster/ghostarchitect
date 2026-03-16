"use client";

import { useEffect, useRef, useState } from "react";
import { useScoreStore } from "@/stores/scoreStore";
import { useGameStore } from "@/stores/gameStore";
import { motion, AnimatePresence } from "framer-motion";

interface FloatingLabel {
  id: number;
  text: string;
  delta: number;
}

const PHASE_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  breach: "Breach",
  investigation: "Investigation",
  debrief: "Debrief",
};

const CATEGORY_BAR_COLORS: Record<string, string> = {
  phishingIQ:       "bg-[var(--info)]",
  passwordHygiene:  "bg-[var(--success)]",
  networkSecurity:  "bg-[var(--warning)]",
  forensicSkill:    "bg-[var(--accent)]",
};

export function HUD() {
  const trustScore = useScoreStore((s) => s.trustScore);
  const categoryScores = useScoreStore((s) => s.categoryScores);
  const visualMode = useGameStore((s) => s.visualMode);
  const phase = useGameStore((s) => s.phase);
  const prevTrust = useRef(trustScore);
  const [floats, setFloats] = useState<FloatingLabel[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const nextId = useRef(0);
  const isBreach = visualMode === "breach";

  useEffect(() => {
    const delta = trustScore - prevTrust.current;
    prevTrust.current = trustScore;
    if (delta === 0) return;

    const id = nextId.current++;
    const text = delta > 0 ? `+${delta} Trust` : `${delta} Trust`;
    setFloats((f) => [...f, { id, text, delta }]);

    const timer = setTimeout(() => {
      setFloats((f) => f.filter((fl) => fl.id !== id));
    }, 1200);
    return () => clearTimeout(timer);
  }, [trustScore]);

  const totalScore = Object.values(categoryScores).reduce(
    (a, b) => a + b,
    0
  );

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (trustScore / 100) * circumference;

  const containerStyle = isBreach
    ? { background: "rgba(5,7,9,0.85)", backdropFilter: "blur(8px)", border: "1px solid var(--border)" }
    : { background: "rgba(255,255,255,0.80)", backdropFilter: "blur(8px)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" };

  return (
    <div
      className="fixed top-3 right-3 z-40 flex items-center gap-3 select-none rounded-xl px-3 py-2"
      style={containerStyle}
    >
      {/* Trust gauge */}
      <div className="relative flex flex-col items-center">
        <div
          className="relative w-14 h-14"
          style={isBreach ? { filter: "drop-shadow(0 0 4px currentColor)" } : undefined}
        >
          <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth="3.5"
            />
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke={trustScore >= 50 ? "var(--success)" : "var(--danger)"}
              strokeWidth="3.5"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
            {trustScore}
          </span>
          {isBreach && (
            <div className="absolute inset-0 rounded-full shadow-[0_0_8px_rgba(255,45,85,0.5)]" />
          )}
        </div>
        {/* Phase label */}
        <span className="text-[10px] uppercase tracking-wide mt-0.5 leading-none" style={{ color: "var(--text-muted)" }}>
          {PHASE_LABELS[phase] ?? phase}
        </span>
      </div>

      {/* Score bars with tooltip */}
      <div
        className="w-[120px] relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="text-[9px] mb-1" style={{ color: "var(--text-muted)" }}>
          Score: {totalScore}/100
        </div>
        {/* Four category bars */}
        <div className="space-y-1">
          {(Object.keys(CATEGORY_BAR_COLORS) as Array<keyof typeof categoryScores>).map((cat) => (
            <div key={cat} className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--bg-window-sunken)" }}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${CATEGORY_BAR_COLORS[cat]}`}
                style={{ width: `${(categoryScores[cat] / 25) * 100}%` }}
              />
            </div>
          ))}
        </div>

        {/* Category breakdown tooltip */}
        {showTooltip && (
          <div className="absolute top-full left-0 mt-1 rounded p-2 text-[9px] whitespace-nowrap z-50 shadow-lg" style={{ background: "#e2e8f0", border: "1px solid var(--border)", color: "#1e293b" }}>
            <div className="flex justify-between gap-3">
              <span>Phishing IQ</span>
              <span className="font-mono">{categoryScores.phishingIQ}/25</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Password Hygiene</span>
              <span className="font-mono">{categoryScores.passwordHygiene}/25</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Network Security</span>
              <span className="font-mono">{categoryScores.networkSecurity}/25</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Forensic Skill</span>
              <span className="font-mono">{categoryScores.forensicSkill}/25</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating labels */}
      <AnimatePresence>
        {floats.map((f) => (
          <motion.span
            key={f.id}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className={`absolute -top-2 right-0 text-sm font-bold ${
              isBreach
                ? f.delta > 0
                  ? "text-[var(--accent)]"
                  : "text-[var(--accent-red)]"
                : "text-[var(--accent)]"
            }`}
          >
            {f.text}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
