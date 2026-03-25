"use client";

import { motion } from "framer-motion";
import Link from "next/link";

function ObfuscatedEmail() {
  // Built at render time — not present as plain text in the HTML source
  const parts = ["enquiries", "\u0040", "ghostarchitectgame", "\u002E", "com"];
  const address = parts.join("");
  const display = parts[0] + " [at] " + parts[2] + " [dot] " + parts[4];

  return (
    <a
      href={`mailto:${address}`}
      className="underline underline-offset-2 hover:text-white transition-colors"
      style={{ color: "var(--accent, #00e533)" }}
      aria-label="Send email to Ghost Architect enquiries"
    >
      {display}
    </a>
  );
}

const stagger = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function AboutPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center px-6 py-16"
      style={{ background: "#050709", color: "#fff" }}
    >
      <div className="w-full max-w-2xl space-y-10">
        {/* Back link */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={stagger}>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase transition-colors hover:text-white"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <span>←</span> Back to Ghost Architect
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div custom={1} initial="hidden" animate="visible" variants={stagger} className="space-y-3">
          <div
            className="inline-block px-3 py-1 rounded-full text-[9px] font-bold tracking-[0.3em] uppercase border"
            style={{ color: "var(--accent, #00e533)", borderColor: "rgba(0,229,51,0.3)", background: "rgba(0,229,51,0.06)" }}
          >
            About This Project
          </div>
          <h1 className="text-3xl font-black tracking-tight leading-tight">
            Ghost Architect
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)" }} className="text-sm font-mono tracking-wider">
            A free cybersecurity training simulation
          </p>
        </motion.div>

        {/* Divider */}
        <motion.hr custom={2} initial="hidden" animate="visible" variants={stagger} style={{ borderColor: "rgba(255,255,255,0.08)" }} />

        {/* Goal */}
        <motion.section custom={3} initial="hidden" animate="visible" variants={stagger} className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--accent, #00e533)" }}>
            What Is This
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            Ghost Architect is an interactive browser-based simulation that puts players in the role of a newly hired Security Analyst responding to a live corporate breach. It covers the full incident response lifecycle: phishing triage, password hygiene, rogue network detection, log forensics, process analysis, and post-breach containment.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            Each session is scored across four competency dimensions — Phishing IQ, Password Hygiene, Network Security, and Forensic Skill — and ends with a branching outcome based on the analyst&apos;s decisions throughout the scenario.
          </p>
        </motion.section>

        {/* Community */}
        <motion.section custom={4} initial="hidden" animate="visible" variants={stagger} className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--accent, #00e533)" }}>
            Free Contribution to the Community
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            This project is a free contribution to the cybersecurity community. It was built to give security trainers a modern, engaging tool they can deploy without cost — and to give individuals a realistic, hands-on way to test and sharpen their threat awareness.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            Trainers can create teams, issue invite codes, and monitor participant progress through a real-time leaderboard. There are no accounts, no fees, and no data sold. Session data is anonymous and purged when no longer needed.
          </p>
        </motion.section>

        {/* Who built it */}
        <motion.section custom={5} initial="hidden" animate="visible" variants={stagger} className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--accent, #00e533)" }}>
            Who Built It
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            Designed and developed by{" "}
            <a
              href="https://demandcluster.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-white transition-colors"
              style={{ color: "rgba(255,255,255,0.9)" }}
            >
              Demandcluster
            </a>
            . Development by Ron van Etten. Quality assurance by Mendel Douma.
          </p>
        </motion.section>

        {/* Contact */}
        <motion.section custom={6} initial="hidden" animate="visible" variants={stagger}
          className="rounded-xl p-6 space-y-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--accent, #00e533)" }}>
            Get In Touch
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            Interested in deploying Ghost Architect for your organisation, obtaining a free branded team dashboard, contributing to the project, or just want to say hello? Reach us at:
          </p>
          <p className="text-sm font-mono">
            <ObfuscatedEmail />
          </p>
        </motion.section>

        {/* Footer */}
        <motion.div custom={7} initial="hidden" animate="visible" variants={stagger}
          className="text-center font-mono text-[9px] tracking-widest uppercase pt-4"
          style={{ color: "rgba(255,255,255,0.15)" }}
        >
          &copy; 2026 Ghost Architect &middot; Demandcluster &middot; Technical Simulation v2.4.0
        </motion.div>
      </div>
    </div>
  );
}
