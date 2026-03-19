"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ScoreAnimationProps {
  delta: number;
  show: boolean;
  label?: string;
  onComplete?: () => void;
}

export function ScoreAnimation({ delta, show, label, onComplete }: ScoreAnimationProps) {
  const isPositive = delta >= 0;

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 0, scale: 0.8 }}
          animate={{ opacity: 1, y: -40, scale: 1 }}
          exit={{ opacity: 0, y: -60, scale: 1.1 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          className={`fixed top-1/4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg font-bold text-sm shadow-lg pointer-events-none ${
            isPositive
              ? "bg-[var(--success-subtle)] text-[var(--success)] border border-[var(--success)]/50"
              : "bg-[var(--danger-subtle)] text-[var(--danger)] border border-[var(--danger)]/50"
          }`}
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </motion.span>
          {label && (
            <span className="ml-2 text-xs font-normal opacity-80">{label}</span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface FloatingScoreProps {
  id: string;
  points: number;
  category?: string;
}

export function FloatingScore({ points, category }: FloatingScoreProps) {
  const isPositive = points >= 0;

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -30, scale: 1.2 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      exit={{ opacity: 0 }}
      className={`text-xs font-bold ${
        isPositive ? "text-[var(--success)]" : "text-[var(--danger)]"
      }`}
    >
      {points > 0 ? "+" : ""}
      {points}
      {category && <span className="ml-1 opacity-60 text-[10px]">{category}</span>}
    </motion.div>
  );
}
