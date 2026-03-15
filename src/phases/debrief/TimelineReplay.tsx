"use client";

import { motion } from "framer-motion";
import { useNarrativeStore } from "@/stores/narrativeStore";

const PHASE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  onboarding: { label: "Onboarding", color: "text-[#3b82f6]", bg: "bg-[rgba(37,99,235,0.12)]" },
  breach: { label: "Breach", color: "text-[#ef4444]", bg: "bg-[rgba(220,38,38,0.12)]" },
  investigation: { label: "Investigation", color: "text-[#f59e0b]", bg: "bg-[rgba(217,119,6,0.12)]" },
  debrief: { label: "Debrief", color: "text-[#22c55e]", bg: "bg-[rgba(22,163,74,0.12)]" },
};

const PHASE_DOT_COLORS: Record<string, string> = {
  onboarding: "bg-blue-500",
  breach: "bg-red-500",
  investigation: "bg-amber-500",
  debrief: "bg-green-500",
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function TimelineReplay() {
  const timeline = useNarrativeStore((s) => s.timeline);

  if (timeline.length === 0) {
    return (
      <div className="text-sm text-text-muted p-4">
        No timeline entries recorded.
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-accent/30" />

      {timeline.map((entry, i) => {
        const badge = PHASE_BADGES[entry.phase];
        const dotColor = PHASE_DOT_COLORS[entry.phase] || "bg-accent";

        return (
          <motion.div
            key={entry.id}
            className="relative mb-4"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05, ease: "easeOut" }}
          >
            {/* Dot */}
            <div className={`absolute -left-4 top-1 w-3 h-3 rounded-full ${dotColor} border-2 border-bg-primary`} />

            <div className="pl-4">
              <div className="flex items-center gap-2 text-[10px] text-text-muted">
                {badge ? (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${badge.color} ${badge.bg}`}>
                    {badge.label}
                  </span>
                ) : (
                  <span className="uppercase font-medium text-accent">
                    {entry.phase}
                  </span>
                )}
                <span>{formatTimestamp(entry.timestamp)}</span>
              </div>
              <p className="text-xs text-text-primary mt-0.5">
                {entry.description}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
