"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import { useScoreStore } from "@/stores/scoreStore";
import { computeTotal } from "@/engine/scoring";

interface TrophyBadgeProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TrophyBadge({ isOpen, onClose }: TrophyBadgeProps) {
  const prefersReducedMotion = useReducedMotion();
  const categoryScores = useScoreStore((s) => s.categoryScores);

  // Compute total from category scores only (time bonus system not currently implemented)
  const totalScore = computeTotal(categoryScores);
  const rank = calculateRank(totalScore);

  const handleBadgeReveal = () => {
    // Fire confetti when trophy emoji completes bounce animation
    // Skip for users who prefer reduced motion
    if (!prefersReducedMotion) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: rank.colors
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="bg-[var(--bg-window)] rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl border border-[var(--border)]"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            {/* Trophy emoji with confetti on reveal */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              onAnimationComplete={handleBadgeReveal}
              className="text-8xl mb-4"
            >
              {rank.emoji}
            </motion.div>

            {/* Rank and score */}
            <div className={`font-bold text-3xl ${rank.className} mb-2`}>
              {rank.name}
            </div>

            <div className="text-[var(--text-secondary)] text-lg">
              Final Score:{" "}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="font-bold text-[var(--accent)]"
              >
                {totalScore}
              </motion.span>
            </div>

            {/* Close button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-[var(--accent)] text-white rounded-lg font-medium"
            >
              Continue
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function calculateRank(score: number): {
  name: string;
  emoji: string;
  className: string;
  colors: string[];
} {
  // Score is category score only, not including time bonus
  if (score >= 450) {
    return { name: "PLATINUM", emoji: "🏆", className: "text-slate-300", colors: ["#cbd5e1", "#e2e8f0", "#ffffff"] };
  }
  if (score >= 400) {
    return { name: "GOLD", emoji: "🥇", className: "text-yellow-400", colors: ["#facc15", "#fde047", "#ffffff"] };
  }
  if (score >= 250) {
    return { name: "SILVER", emoji: "🥈", className: "text-slate-400", colors: ["#94a3b8", "#cbd5e1", "#ffffff"] };
  }
  return { name: "BRONZE", emoji: "🥉", className: "text-amber-700", colors: ["#b45309", "#d97706", "#ffffff"] };
}
