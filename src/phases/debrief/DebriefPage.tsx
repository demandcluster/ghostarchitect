"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RadarChart } from "./RadarChart";
import { TimelineReplay } from "./TimelineReplay";
import { Endings } from "./Endings";
import { MitreMapping } from "./MitreMapping";
import { useScoreStore, ScoreCategory, ScoreAction } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { deriveFlags } from "@/engine/rules";
import { TrophyBadge } from "@/shared/components/TrophyBadge";

const CATEGORY_LABELS: Record<ScoreCategory, string> = {
  phishingIQ: "Phishing IQ",
  passwordHygiene: "Password Hygiene",
  networkSecurity: "Network Security",
  forensicSkill: "Forensic Skill",
};

type Tab = "results" | "timeline" | "mitre";

const ENDING_BADGE: Record<string, { label: string; classes: string }> = {
  promoted: { label: "PROMOTED",  classes: "bg-[var(--success-subtle)] text-[var(--success)] ring-1 ring-[var(--success)]/30" },
  fired:    { label: "FIRED",     classes: "bg-[var(--danger-subtle)] text-[var(--danger)] ring-1 ring-[var(--danger)]/30" },
  lateral:  { label: "LATERAL",   classes: "bg-[var(--info-subtle)] text-[var(--info)] ring-1 ring-[var(--info)]/30" },
  neutral:  { label: "NEUTRAL",   classes: "bg-[var(--bg-window-sunken)] text-[var(--text-muted)] ring-1 ring-[var(--border)]" },
};

export function DebriefPage() {
  const [activeTab, setActiveTab] = useState<Tab>("results");
  const [showTrophy, setShowTrophy] = useState(false);
  const trophyShownRef = useRef(false);
  const decisions = useNarrativeStore((s) => s.decisions);
  const flags = useNarrativeStore((s) => s.flags);
  const trustScore = useScoreStore((s) => s.trustScore);
  const actions = useScoreStore((s) => s.actions);
  const categoryScores = useScoreStore((s) => s.categoryScores);

  const derived = deriveFlags(decisions, flags);

  // Show trophy after debrief has rendered, only once
  useEffect(() => {
    if (trophyShownRef.current) return;

    const timer = setTimeout(() => {
      setShowTrophy(true);
      trophyShownRef.current = true;
    }, 1000); // 1s delay for impact

    return () => clearTimeout(timer);
  }, []);

  const actionsByCategory = actions.reduce<Record<string, ScoreAction[]>>(
    (acc, action) => {
      if (!acc[action.category]) acc[action.category] = [];
      acc[action.category].push(action);
      return acc;
    },
    {}
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "results", label: "Results" },
    { id: "timeline", label: "Timeline" },
    { id: "mitre", label: "MITRE ATT&CK" },
  ];

  const endingMeta = ENDING_BADGE[derived.ending] ?? ENDING_BADGE.neutral;

  return (
    <div className="p-6 overflow-auto h-full">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] leading-tight">
          Incident Debrief
        </h2>
        <span className={`px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${endingMeta.classes}`}>
          {endingMeta.label}
        </span>
      </div>
      <div className="flex items-center gap-6 mb-7">
        <p className="text-sm text-[var(--text-muted)]">
          Trust Score: <span className="font-bold text-[var(--text-primary)]">{trustScore}/100</span>
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          Total Forensic Score: <span className="font-bold text-accent">{Object.values(categoryScores).reduce((a,b)=>a+b,0)}</span>
        </p>
      </div>

      {/* Pill tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-[var(--bg-window-sunken)] border border-[var(--border)] w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-1.5 text-xs font-medium rounded-lg transition-colors
              ${
                activeTab === tab.id
                  ? "bg-[var(--bg-window)] shadow-sm text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            <RadarChart />

            {/* Decision Breakdown */}
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Decision Breakdown
              </h3>
              {(Object.keys(CATEGORY_LABELS) as ScoreCategory[]).map((cat) => (
                <div key={cat} className="rounded-xl border border-[var(--border)] bg-[var(--bg-window-raised)] overflow-hidden">
                  <div className="flex items-center justify-between px-4.5 py-3.5 border-b border-[var(--border)]">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <span className="text-base font-bold text-accent">
                      {categoryScores[cat]}
                    </span>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {(actionsByCategory[cat] || []).map((action) => (
                      <div
                        key={action.id}
                        className="flex items-center justify-between px-4.5 py-2.5 text-sm"
                      >
                        <span className="text-[var(--text-muted)]">{action.label}</span>
                        <span className="text-[var(--text-secondary)] font-mono">
                          +{action.points}
                        </span>
                      </div>
                    ))}
                    {(actionsByCategory[cat] || []).length === 0 && (
                      <div className="px-4.5 py-3 text-sm text-[var(--text-muted)] italic">No actions recorded.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Endings ending={derived.ending} />
          </motion.div>
        )}

        {activeTab === "timeline" && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <TimelineReplay />
          </motion.div>
        )}

        {activeTab === "mitre" && (
          <motion.div
            key="mitre"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <MitreMapping />
          </motion.div>
        )}
      </AnimatePresence>

      <TrophyBadge
        isOpen={showTrophy}
        onClose={() => setShowTrophy(false)}
      />
    </div>
  );
}
