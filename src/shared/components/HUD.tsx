"use client";

import { useEffect, useRef, useState } from "react";
import { useScoreStore } from "@/stores/scoreStore";
import { useGameStore } from "@/stores/gameStore";
import { motion, AnimatePresence } from "framer-motion";
import { CATEGORY_NOMINAL_MAX } from "@/engine/scoring";

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
  const prevScores = useRef(categoryScores);
  const [floats, setFloats] = useState<FloatingLabel[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [scorePulse, setScorePulse] = useState<number | null>(null);
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

  // Pulse effect when any category score changes
  useEffect(() => {
    Object.keys(categoryScores).forEach((cat) => {
      const prevVal = prevScores.current[cat as keyof typeof prevScores.current];
      const currVal = categoryScores[cat as keyof typeof categoryScores];
      if (prevVal !== currVal) {
        setScorePulse(prev => prev === null ? Date.now() : prev);
        // Clear pulse after animation
        setTimeout(() => setScorePulse(null), 500);
      }
    });
    prevScores.current = categoryScores;
  }, [categoryScores]);

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
    <motion.div
      drag
      dragMomentum={false}
      className="fixed bottom-14 left-3 z-40 flex items-center gap-3 select-none rounded-xl px-3 py-2 cursor-move shadow-lg"
      style={containerStyle}
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Trust gauge */}
      <div className="relative flex flex-col items-center pointer-events-none">
        <motion.div
          className="relative w-14 h-14"
          style={isBreach ? { filter: "drop-shadow(0 0 4px currentColor)" } : undefined}
          animate={scorePulse ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.3 }}
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
            <motion.circle
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
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </svg>
          <motion.span
            className="absolute inset-0 flex items-center justify-center text-[13px] font-bold"
            style={{ color: "var(--text-primary)" }}
            key={trustScore}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, type: "spring", stiffness: 500 }}
          >
            {trustScore}
          </motion.span>
          {isBreach && (
            <motion.div
              className="absolute inset-0 rounded-full shadow-[0_0_8px_rgba(255,45,85,0.5)]"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.div>
        {/* Phase label */}
        <motion.span
          className="text-[10px] uppercase tracking-wide mt-0.5 leading-none"
          style={{ color: "var(--text-muted)" }}
          key={phase}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {PHASE_LABELS[phase] ?? phase}
        </motion.span>
      </div>

      {/* Score bars with tooltip */}
      <div
        className="w-[120px] relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <motion.div
          className="text-[9px] mb-1 font-bold text-accent"
          key={totalScore}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, type: "spring" }}
        >
          Score: {totalScore}
        </motion.div>
        {/* Four category bars */}
        <div className="space-y-1">
          {(Object.keys(CATEGORY_BAR_COLORS) as Array<keyof typeof categoryScores>).map((cat) => {
            const score = categoryScores[cat];
            const width = `${Math.min(100, (score / CATEGORY_NOMINAL_MAX[cat]) * 100)}%`;
            return (
              <div key={cat} className="h-[3px] rounded-full overflow-hidden" style={{ background: "var(--bg-window-sunken)" }}>
                <motion.div
                  className={`h-full rounded-full ${CATEGORY_BAR_COLORS[cat]}`}
                  initial={{ width: "0%" }}
                  animate={{ width }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                />
              </div>
            );
          })}
        </div>

        {/* Category breakdown tooltip */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full left-0 mt-1 rounded p-2 text-[9px] whitespace-nowrap z-50 shadow-lg pointer-events-none"
              style={{ background: "#e2e8f0", border: "1px solid var(--border)", color: "#1e293b" }}
            >
              {Object.keys(categoryScores).map((cat) => (
                <div key={cat} className="flex justify-between gap-3">
                  <span>{cat === "phishingIQ" ? "Phishing IQ" : cat === "passwordHygiene" ? "Password Hygiene" : cat === "networkSecurity" ? "Network Security" : "Forensic Skill"}</span>
                  <span className="font-mono">{categoryScores[cat as keyof typeof categoryScores]}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating labels */}
      <AnimatePresence mode="popLayout">
        {floats.map((f) => (
          <motion.span
            key={f.id}
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -30, scale: 1.1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
            className={`absolute -top-2 right-0 text-sm font-bold ${
              isBreach
                ? f.delta > 0
                  ? "text-[var(--accent)]"
                  : "text-[var(--accent-red)]"
                : f.delta > 0
                  ? "text-[var(--success)]"
                  : "text-[var(--danger)]"
            }`}
            style={{
              textShadow: isBreach ? "0 0 10px currentColor" : undefined,
            }}
          >
            {f.delta > 0 ? "+" : ""}{f.delta}
          </motion.span>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
