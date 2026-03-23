"use client";

import { motion } from "framer-motion";
import type { Ending } from "@/engine/rules";
import type { ScoreCategory } from "@/stores/scoreStore";

interface IncidentReportProps {
  ending: Ending;
  verdict: string;
  color: string;
  teamName: string;
  playerHandle: string;
  categoryScores: Record<ScoreCategory, number>;
  remark: string;
  onPlayAgain: () => void;
}

const SUMMARY_TEXT: Record<Ending, string> = {
  promoted: "successfully containing the breach within 47 minutes with zero data exfiltration confirmed.",
  lateral: "contained the breach with minor procedural deviations noted. Transfer to Security Operations recommended.",
  neutral: "investigation concluded with mixed results. Further training recommended before next incident rotation.",
  fired: "breach resulted in exfiltration of 4,500 records. Containment protocols were not followed.",
};

const CATEGORY_LABELS: Record<ScoreCategory, string> = {
  phishingIQ: "Phishing IQ",
  passwordHygiene: "Password Hygiene",
  networkSecurity: "Network Security",
  forensicSkill: "Forensic Skill",
};

const stagger = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" as const },
  }),
};

export function IncidentReport({ ending, verdict, color, teamName, playerHandle, categoryScores, remark, onPlayAgain }: IncidentReportProps) {
  const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const date = new Date().toLocaleDateString();
  const headerBg = ending === "fired" ? "#7f1d1d" : "#1e293b";

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-y-auto py-8" style={{ background: "#111" }}>
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-[90%] max-w-[520px] rounded overflow-hidden"
        style={{ background: "#f8f7f4", boxShadow: "0 8px 40px rgba(0,0,0,0.5)", fontFamily: "Georgia, serif" }}>
        {/* CONFIDENTIAL watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{ transform: "rotate(-35deg)", fontSize: 64, fontWeight: 900, color: "rgba(0,0,0,0.04)", letterSpacing: 12 }}>
          CONFIDENTIAL
        </div>

        {/* Header bar */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={stagger}
          className="flex justify-between items-center px-6 py-4" style={{ background: headerBg, color: "white" }}>
          <div>
            <div className="font-bold text-sm tracking-wider" style={{ fontFamily: "sans-serif" }}>{teamName.toUpperCase()}</div>
            <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>Internal Security Division</div>
          </div>
          <div className="text-right">
            <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>CLASSIFICATION</div>
            <div className="text-[11px] font-semibold" style={{ color: "#f59e0b" }}>CONFIDENTIAL</div>
          </div>
        </motion.div>

        <div className="p-6" style={{ color: "#1a1a1a" }}>
          {/* Title block */}
          <motion.div custom={1} initial="hidden" animate="visible" variants={stagger} className="border-b-2 border-[#1e293b] pb-3 mb-4">
            <div className="text-base font-bold" style={{ color: "#1e293b" }}>INCIDENT RESPONSE REPORT</div>
            <div className="text-[10px] mt-1" style={{ color: "#64748b" }}>
              Case #GA-2026-0847 &nbsp;|&nbsp; Classification: Confidential &nbsp;|&nbsp; Date: {date}
            </div>
          </motion.div>

          {/* Personnel row */}
          <motion.div custom={2} initial="hidden" animate="visible" variants={stagger} className="flex gap-8 mb-4 text-[11px]">
            <div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: "#64748b" }}>Responding Analyst</div>
              <div className="font-semibold mt-0.5" style={{ color: "#1e293b" }}>{playerHandle}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: "#64748b" }}>Division</div>
              <div className="font-semibold mt-0.5" style={{ color: "#1e293b" }}>{teamName} — SOC</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: "#64748b" }}>Disposition</div>
              <div className="font-bold mt-0.5" style={{ color }}>{verdict}</div>
            </div>
          </motion.div>

          {/* Executive Summary */}
          <motion.div custom={3} initial="hidden" animate="visible" variants={stagger} className="mb-4">
            <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#64748b" }}>Executive Summary</div>
            <div className="text-xs leading-[1.7]" style={{ color: "#334155" }}>
              On {date}, {teamName} SOC detected unauthorized access to internal systems via compromised service account{" "}
              <code className="bg-[#e2e8f0] px-1 py-px rounded text-[11px]" style={{ fontFamily: "monospace" }}>svc_backup</code>.
              Analyst <strong>{playerHandle}</strong> led the incident response, {SUMMARY_TEXT[ending]}
            </div>
          </motion.div>

          {/* Performance Assessment */}
          <motion.div custom={4} initial="hidden" animate="visible" variants={stagger} className="mb-4">
            <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#64748b" }}>Performance Assessment</div>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(CATEGORY_LABELS) as ScoreCategory[]).map((cat) => (
                <div key={cat} className="flex justify-between bg-[#f1f5f9] px-3 py-2 rounded text-[11px]">
                  <span style={{ color: "#64748b" }}>{CATEGORY_LABELS[cat]}</span>
                  <span className="font-bold" style={{ color: "#1e293b" }}>{categoryScores[cat]}/25</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Analyst Note */}
          <motion.div custom={5} initial="hidden" animate="visible" variants={stagger} className="mb-4 rounded-r py-2.5 px-3.5" style={{ background: "#fffbeb", borderLeft: "3px solid #f59e0b" }}>
            <div className="text-[10px] font-semibold mb-1" style={{ color: "#92400e" }}>ANALYST NOTE</div>
            <div className="text-[11px] italic leading-relaxed" style={{ color: "#78350f" }}>
              &ldquo;{remark}&rdquo;
            </div>
          </motion.div>

          {/* FIRED: Dark web listing */}
          {ending === "fired" && (
            <motion.div custom={6} initial="hidden" animate="visible" variants={stagger} className="mb-4">
              <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "#64748b" }}>Data Exposure Summary</div>
              <div className="relative p-3 rounded overflow-hidden" style={{ background: "#0d1117", border: "1px solid #333" }}>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="font-bold select-none text-sm" style={{ color: "#333", transform: "rotate(-15deg)" }}>SIMULATION — NO REAL DATA</span>
                </div>
                <div className="relative z-10 font-mono text-[10px] space-y-0.5">
                  <div style={{ color: "#e63946" }}>[DARK WEB MARKETPLACE]</div>
                  <div style={{ color: "#c9d1d9" }}>Listing: {teamName} Employee Database (4,500 records)</div>
                  <div style={{ color: "#c9d1d9" }}>Price: 0.15 BTC</div>
                  <div style={{ color: "#c9d1d9" }}>Sample: Doe, Jane | SSN: 9XX-XX-XXXX</div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Footer */}
          <motion.div custom={ending === "fired" ? 7 : 6} initial="hidden" animate="visible" variants={stagger} className="flex justify-between items-center pt-3 border-t border-[#e2e8f0]">
            <div className="text-[9px]" style={{ color: "#94a3b8" }}>This document is the property of {teamName}. Unauthorized distribution prohibited.</div>
            <div className="text-[9px]" style={{ color: "#94a3b8" }}>Page 1 of 1</div>
          </motion.div>
        </div>

        {/* Faded stamp watermark */}
        <div className="absolute bottom-[60px] right-[30px] rounded-md px-5 py-1.5"
          style={{ border: `3px solid ${color}66`, transform: "rotate(-12deg)" }}>
          <div className="font-black tracking-[4px] text-lg" style={{ color: `${color}66` }}>{verdict}</div>
        </div>
      </motion.div>

      {/* Play Again */}
      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.5 }}
        onClick={onPlayAgain}
        className="mt-8 px-8 py-3 rounded-lg text-sm font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
        style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
        Play Again
      </motion.button>

      {/* Credits with spotlight sweep */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="text-center mt-4 space-y-1.5 relative overflow-hidden"
      >
        {/* Spotlight sweep */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)`,
            backgroundSize: "200% 100%",
            animation: "spotlight-sweep 11s ease-in-out 3s infinite",
          }}
        />
        <style>{`
          @keyframes spotlight-sweep {
            0%, 100% { background-position: 200% 0; }
            50% { background-position: -100% 0; }
          }
        `}</style>
        <div style={{ color: "rgba(255,255,255,0.2)" }} className="text-[10px] uppercase tracking-[3px]">
          A contribution to the cybersecurity community
        </div>
        <div style={{ color: "rgba(255,255,255,0.3)" }} className="text-xs">
          Brought to you by{" "}
          <a
            href="https://demandcluster.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors hover:text-white"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Demandcluster
          </a>
        </div>
        <div style={{ color: "rgba(255,255,255,0.2)" }} className="text-[11px]">
          Developed by Ron van Etten &middot; Tested by Mendel Douma
        </div>
      </motion.div>
    </div>
  );
}
