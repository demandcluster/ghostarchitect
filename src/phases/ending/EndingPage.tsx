"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { deriveFlags, type Ending } from "@/engine/rules";
import { useGameStore } from "@/stores/gameStore";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { ClassifiedStamp } from "./ClassifiedStamp";
import { IncidentReport } from "./IncidentReport";
import { getStaticRemark, getCachedRemark } from "./analystRemarks";

interface EndingPageProps {
  onPlayAgain: () => void;
}

const VERDICT_CONFIG: Record<Ending, { verdict: string; color: string; subtitle: string }> = {
  promoted: { verdict: "PROMOTED", color: "#22c55e", subtitle: "Senior Security Analyst" },
  lateral: { verdict: "LATERAL", color: "#3b82f6", subtitle: "Transferred to Security Operations" },
  neutral: { verdict: "NEUTRAL", color: "#a1a1aa", subtitle: "Investigation Concluded" },
  fired: { verdict: "FIRED", color: "#ef4444", subtitle: "Security Clearance Revoked" },
};

type Phase = "typewriter" | "stamp" | "report";
const TYPEWRITER_LINE = "Incident #GA-2026-0847 \u2014 Final disposition pending...";

export function EndingPage({ onPlayAgain }: EndingPageProps) {
  const { teamName, playerHandle } = useGameStore((s) => ({ teamName: s.teamName, playerHandle: s.playerHandle }));
  const categoryScores = useScoreStore((s) => s.categoryScores);
  const { decisions, flags } = useNarrativeStore((s) => ({ decisions: s.decisions, flags: s.flags }));
  const { ending } = deriveFlags(decisions, flags);
  const config = VERDICT_CONFIG[ending];

  const [phase, setPhase] = useState<Phase>("typewriter");
  const [typedChars, setTypedChars] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Read AI remark from cache (prefetched during debrief), fall back to static
  const resolvedRemark = getCachedRemark() || getStaticRemark(flags);

  const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => { if (prefersReduced) setPhase("report"); }, [prefersReduced]);

  useEffect(() => {
    if (phase !== "typewriter" || prefersReduced) return;
    if (typedChars >= TYPEWRITER_LINE.length) {
      const t = setTimeout(() => setPhase("stamp"), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTypedChars((c) => c + 1), 35);
    return () => clearTimeout(t);
  }, [phase, typedChars, prefersReduced]);

  useEffect(() => {
    if (phase !== "typewriter") return;
    const i = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(i);
  }, [phase]);

  useEffect(() => {
    if (phase !== "report") return;
    if (ending === "promoted" || ending === "lateral") {
      setTimeout(() => {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: [config.color, "#ffffff", "#fbbf24"] });
      }, 800);
    }
  }, [phase, ending, config.color]);

  const handleStampComplete = useCallback(() => { setPhase("report"); }, []);

  return (
    <div className="fixed inset-0 z-[9999]" style={{ background: "#0a0a0a" }}>
      <AnimatePresence mode="wait">
        {phase === "typewriter" && (
          <motion.div key="typewriter" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="fixed inset-0 flex items-center justify-center">
            <div className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              {TYPEWRITER_LINE.slice(0, typedChars)}
              <span style={{ opacity: cursorVisible ? 1 : 0, color: config.color, transition: "opacity 0.1s" }}>|</span>
            </div>
          </motion.div>
        )}
        {phase === "stamp" && (
          <motion.div key="stamp" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
            <ClassifiedStamp verdict={config.verdict} color={config.color} subtitle={config.subtitle} onComplete={handleStampComplete} />
          </motion.div>
        )}
        {phase === "report" && (
          <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <IncidentReport ending={ending} verdict={config.verdict} color={config.color}
              teamName={teamName} playerHandle={playerHandle || "Analyst"}
              categoryScores={categoryScores} remark={resolvedRemark} onPlayAgain={onPlayAgain} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
