"use client";

import { motion } from "framer-motion";
import type { Ending } from "@/engine/rules";
import { useScoreStore } from "@/stores/scoreStore";
import { useGameStore } from "@/stores/gameStore";

interface EndingsProps {
  ending: Ending;
}

export function Endings({ ending }: EndingsProps) {
  const total = Object.values(useScoreStore.getState().categoryScores).reduce(
    (a, b) => a + b,
    0
  );
  const fakeDomain = useGameStore((s) => s.fakeDomain);
  const teamName = useGameStore((s) => s.teamName);

  if (ending === "fired")
    return <FiredEnding score={total} teamName={teamName} />;
  if (ending === "promoted")
    return <PromotedEnding score={total} fakeDomain={fakeDomain} />;
  if (ending === "lateral") return <LateralEnding score={total} />;
  return <NeutralEnding score={total} />;
}

function FiredEnding({ score, teamName }: { score: number; teamName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Mock news article */}
      <div className="bg-window-sunken rounded-lg border border overflow-hidden">
        <div className="bg-red-600 text-white px-4 py-2 text-xs font-bold">
          BREAKING NEWS
        </div>
        <div className="p-4">
          <h3 className="text-lg font-bold text-text-primary">
            {teamName} Data Breach Exposes Employee Records
          </h3>
          <p className="text-xs text-text-muted mt-1">
            CyberNews Daily | March 11, 2026
          </p>
          <p className="text-sm text-text-secondary mt-3">
            A significant data breach at {teamName} has resulted in the exposure
            of employee personal information. The breach, attributed to
            insufficient incident response, led to the exfiltration of over
            4,500 employee records including names and contact information.
          </p>
          <p className="text-sm text-text-secondary mt-2">
            The company&apos;s IT department has been restructured following the
            incident. An internal review found that critical warning signs were
            missed during the initial breach window.
          </p>
        </div>
      </div>

      {/* Dark web listing */}
      <div className="relative bg-[#0d1117] rounded-lg border border-[#333] p-4 overflow-hidden">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-4xl font-bold text-[#333] rotate-[-30deg] select-none">
            SIMULATION — NO REAL DATA
          </span>
        </div>

        <div className="relative z-10">
          <div className="text-[#e63946] font-mono text-xs mb-2">
            [DARK WEB MARKETPLACE]
          </div>
          <div className="font-mono text-xs text-[#c9d1d9] space-y-1">
            <div>Listing: {teamName} Employee Database (4,500 records)</div>
            <div>Price: 0.15 BTC</div>
            <div>Sample: Doe, Jane | SSN: 9XX-XX-XXXX | DOB: 19XX-XX-XX</div>
            <div className="text-text-muted">
              [All SSNs use structurally invalid 9XX prefix — simulation only]
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-text-secondary">Final Score: {score}/100</p>
        <p className="text-xs text-text-muted mt-1">
          The breach could have been contained with faster response.
        </p>
      </div>
    </motion.div>
  );
}

function PromotedEnding({
  score,
  fakeDomain
}: {
  score: number;
  fakeDomain: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="bg-[rgba(22,163,74,0.08)] rounded-lg border border-[rgba(22,163,74,0.35)] p-6 text-center">
        <h3 className="text-lg font-bold text-[#22c55e]">
          Promoted to Senior Security Analyst
        </h3>
        <p className="text-sm text-text-secondary mt-2">
          Your exceptional response to the Ghost Architect breach has earned
          recognition from the CISO. Your methodical approach — quick
          containment, thorough IOC extraction, and proper escalation — set the
          standard for incident response at {fakeDomain}.
        </p>
      </div>

      <div className="bg-window-sunken rounded-lg border border p-4">
        <div className="text-xs text-text-muted mb-2">
          NEW INCIDENT INCOMING...
        </div>
        <h4 className="text-sm font-bold text-text-primary">
          The Ghost Architect Strikes Again?
        </h4>
        <p className="text-xs text-text-secondary mt-1">
          Three months later, a similar tar+AES-256-CBC staging pattern appears
          on a partner company&apos;s network. The timestamp forensic mistake is
          back — directory mtime newer than contained files. Your expertise is
          requested...
        </p>
        <p className="text-[10px] text-text-muted mt-2 italic">
          To be continued in a future scenario... (all sessions are unique, so
          play again!)
        </p>
      </div>

      <div className="text-center">
        <p className="text-sm text-text-secondary">Final Score: {score}/~500</p>
      </div>
    </motion.div>
  );
}

function LateralEnding({ score }: { score: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="bg-[rgba(37,99,235,0.08)] rounded-lg border border-[rgba(37,99,235,0.35)] p-6">
        <h3 className="text-lg font-bold text-[#3b82f6]">
          Transferred to Security Operations
        </h3>
        <p className="text-sm text-text-secondary mt-2">
          Your response showed promise but had gaps. Management has moved you to
          the SOC team where you can develop your incident response skills with
          more structured mentorship.
        </p>
      </div>
      <div className="text-center text-sm text-text-secondary">
        Score: {score}/~500 — Review the debrief to see where you can improve.
      </div>
    </motion.div>
  );
}

function NeutralEnding({ score }: { score: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="bg-window-sunken rounded-lg border border p-6">
        <h3 className="text-lg font-bold text-text-primary">
          Investigation Concluded
        </h3>
        <p className="text-sm text-text-secondary mt-2">
          The breach was contained, but your response had both strengths and
          weaknesses. Management appreciates your effort but recommends
          additional security training.
        </p>
      </div>
      <div className="text-center text-sm text-text-secondary">
        Score: {score}/100
      </div>
    </motion.div>
  );
}
