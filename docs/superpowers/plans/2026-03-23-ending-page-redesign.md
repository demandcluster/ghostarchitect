# Ending Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat dark ending screen with a cinematic three-act reveal: typewriter → classified stamp → branded incident report document.

**Architecture:** EndingPage orchestrates three phases via state machine. ClassifiedStamp handles GSAP spring animation. IncidentReport is a pure presentational component receiving scores, flags, branding, and a remark string. Analyst remark fetched from AI endpoint at mount with static fallback.

**Tech Stack:** React, GSAP (stamp animation + crossfade), Framer Motion (document entry + section stagger), canvas-confetti, OpenAI (analyst remark endpoint)

**Spec:** `docs/superpowers/specs/2026-03-23-ending-page-redesign.md`

**Notes:** TrophyBadge is triggered in DebriefPage (the step before ending) and needs no changes. `fakeDomain` is listed in the spec data flow but unused — the incident report only needs `teamName` and `playerHandle`.

---

### Task 1: Static Analyst Remark Fallback Map

**Files:**
- Create: `src/phases/ending/analystRemarks.ts`
- Create: `src/phases/ending/__tests__/analystRemarks.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// src/phases/ending/__tests__/analystRemarks.test.ts
import { describe, it, expect } from "vitest";
import { getStaticRemark } from "../analystRemarks";

describe("getStaticRemark", () => {
  it("returns negative flag remark with highest priority", () => {
    const flags = new Set(["chose_strong_password", "clicked_phishing_link"]);
    const remark = getStaticRemark(flags);
    expect(remark).toContain("phishing link");
  });

  it("returns positive flag remark when no negatives", () => {
    const flags = new Set(["caught_all_phishing"]);
    const remark = getStaticRemark(flags);
    expect(remark).toContain("phishing email");
  });

  it("returns generic remark when no flags match", () => {
    const remark = getStaticRemark(new Set());
    expect(remark).toContain("HR");
  });

  it("prefers fell_for_social_engineering over positive flags", () => {
    const flags = new Set(["fell_for_social_engineering", "avoided_evil_twin"]);
    const remark = getStaticRemark(flags);
    expect(remark).toContain("vendor impersonator");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/phases/ending/__tests__/analystRemarks.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement analystRemarks.ts**

```typescript
// src/phases/ending/analystRemarks.ts

/** Priority-ordered remark map. Negative flags first (funnier). */
const REMARK_MAP: [flag: string, remark: string][] = [
  ["clicked_phishing_link", "Clicked a phishing link. The attacker sends their regards."],
  ["fell_for_social_engineering", "Handed credentials to a vendor impersonator within 30 seconds. We've updated the gullibility benchmarks accordingly."],
  ["over_quarantined", "Quarantined PowerShell. The sysadmins would like a word."],
  ["gave_creds_to_vendor", "Shared their password with a stranger on the internet. Boldly going where no security policy wanted them to go."],
  ["chose_strong_password", "Selected a 128-bit passphrase. The password cracker filed a formal complaint."],
  ["caught_all_phishing", "Flagged every phishing email without breaking a sweat. We're checking if they wrote the phishing emails."],
  ["avoided_evil_twin", "Spotted the evil twin AP by BSSID alone. Either well-trained or deeply paranoid. Both useful."],
  ["extracted_all_iocs", "Extracted all six IOCs in under two minutes. The threat actor is requesting a transfer."],
];

const GENERIC_REMARK = "Performed adequately. HR has no further comment at this time.";

export function getStaticRemark(flags: Set<string>): string {
  for (const [flag, remark] of REMARK_MAP) {
    if (flags.has(flag)) return remark;
  }
  return GENERIC_REMARK;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/phases/ending/__tests__/analystRemarks.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/phases/ending/analystRemarks.ts src/phases/ending/__tests__/analystRemarks.test.ts
git commit -m "feat(ending): add static analyst remark fallback map with priority selection"
```

---

### Task 2: Analyst Remark API Endpoint

**Files:**
- Create: `src/app/api/v1/content/analyst-remark/route.ts`

- [ ] **Step 1: Implement the endpoint**

```typescript
// src/app/api/v1/content/analyst-remark/route.ts
import { NextRequest, NextResponse } from "next/server";

const FLAG_DESCRIPTIONS: Record<string, string> = {
  clicked_phishing_link: "clicked a phishing link during email triage",
  fell_for_social_engineering: "fell for a social engineering attempt and gave away credentials",
  over_quarantined: "quarantined a legitimate PowerShell process during investigation",
  gave_creds_to_vendor: "shared their password with a vendor impersonator",
  chose_strong_password: "chose an exceptionally strong password",
  caught_all_phishing: "correctly identified every phishing email",
  avoided_evil_twin: "spotted the evil twin WiFi access point",
  extracted_all_iocs: "extracted all indicators of compromise from the logs",
};

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ remark: "" });

    const { searchParams } = new URL(req.url);
    const flags = (searchParams.get("flags") || "").split(",").filter(Boolean);
    const handle = searchParams.get("handle") || "the analyst";
    const verdict = searchParams.get("verdict") || "neutral";

    // Pick the most interesting flag (first match in priority order)
    const priorityOrder = [
      "clicked_phishing_link", "fell_for_social_engineering", "over_quarantined",
      "gave_creds_to_vendor", "chose_strong_password", "caught_all_phishing",
      "avoided_evil_twin", "extracted_all_iocs",
    ];
    const bestFlag = priorityOrder.find((f) => flags.includes(f));
    const flagDesc = bestFlag ? FLAG_DESCRIPTIONS[bestFlag] : `received a ${verdict} verdict`;

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: 120,
        temperature: 1.0,
        messages: [
          {
            role: "system",
            content: "You write dry, witty analyst notes for corporate incident reports. One to two sentences max. Professional but funny, like a tired security analyst writing notes at 2am. Never use emojis.",
          },
          {
            role: "user",
            content: `Write an analyst note about ${handle}, who ${flagDesc} during a cybersecurity incident response exercise. Verdict: ${verdict}.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return NextResponse.json({ remark: "" });
    const data = await res.json();
    const remark = data.choices?.[0]?.message?.content?.trim() || "";
    // Strip surrounding quotes if the model wraps it
    return NextResponse.json({ remark: remark.replace(/^["']|["']$/g, "") });
  } catch {
    return NextResponse.json({ remark: "" });
  }
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `npm run type-check`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/content/analyst-remark/route.ts
git commit -m "feat(ending): add analyst remark AI endpoint with 5s timeout and graceful fallback"
```

---

### Task 3: ClassifiedStamp Component

**Files:**
- Create: `src/phases/ending/ClassifiedStamp.tsx`

- [ ] **Step 1: Create the stamp component**

This component renders the verdict stamp and drives its GSAP spring animation. It receives `verdict`, `color`, `subtitle`, and an `onComplete` callback fired when the hold time ends.

```typescript
// src/phases/ending/ClassifiedStamp.tsx
"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";

interface ClassifiedStampProps {
  verdict: string;
  color: string;
  subtitle: string;
  onComplete: () => void;
}

export function ClassifiedStamp({ verdict, color, subtitle, onComplete }: ClassifiedStampProps) {
  const stampRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      onComplete();
      return;
    }

    let holdTimer: ReturnType<typeof setTimeout>;
    const tl = gsap.timeline({
      onComplete: () => {
        holdTimer = setTimeout(onComplete, 1500);
      },
    });

    // White flash
    tl.fromTo(flashRef.current, { opacity: 0 }, { opacity: 0.8, duration: 0.05 })
      .to(flashRef.current, { opacity: 0, duration: 0.15 });

    // Stamp slam — spring effect
    tl.fromTo(
      stampRef.current,
      { scale: 1.8, rotation: -15, opacity: 0 },
      { scale: 1, rotation: -6, opacity: 1, duration: 0.4, ease: "back.out(2)" },
      "-=0.05"
    );

    // Glow pulse
    tl.fromTo(
      glowRef.current,
      { opacity: 0.15 },
      { opacity: 0.3, duration: 0.3, yoyo: true, repeat: 1 },
      "-=0.2"
    );

    // Subtitle fade in
    tl.fromTo(
      subtitleRef.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.4 },
      "-=0.3"
    );

    return () => { tl.kill(); clearTimeout(holdTimer); };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center" style={{ background: "#0a0a0a" }}>
      {/* White flash overlay */}
      <div ref={flashRef} className="absolute inset-0 bg-white opacity-0 pointer-events-none" />

      {/* Radial glow */}
      <div
        ref={glowRef}
        className="absolute rounded-full"
        style={{
          width: 400,
          height: 400,
          background: `radial-gradient(circle, ${color}26 0%, transparent 60%)`,
          opacity: 0.15,
        }}
      />

      {/* Stamp */}
      <div
        ref={stampRef}
        className="relative rounded-lg px-12 py-3.5"
        style={{
          border: `4px solid ${color}`,
          transform: "rotate(-6deg) scale(1.8)",
          opacity: 0,
          boxShadow: `0 0 40px ${color}33, inset 0 0 20px ${color}0d`,
        }}
      >
        <div
          className="font-black tracking-[10px]"
          style={{ fontSize: 56, color, textShadow: `0 0 30px ${color}66` }}
        >
          {verdict}
        </div>
      </div>

      {/* Subtitle */}
      <div
        ref={subtitleRef}
        className="mt-5 tracking-[4px] text-[11px]"
        style={{ color: `${color}99`, opacity: 0 }}
      >
        {subtitle}
      </div>

      {/* Case number */}
      <div className="absolute top-4 right-6 font-mono text-[9px]" style={{ color: "rgba(255,255,255,0.15)" }}>
        CASE #GA-2026-0847
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `npm run type-check`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/phases/ending/ClassifiedStamp.tsx
git commit -m "feat(ending): add ClassifiedStamp component with GSAP spring animation"
```

---

### Task 4: IncidentReport Component

**Files:**
- Create: `src/phases/ending/IncidentReport.tsx`

- [ ] **Step 1: Create the incident report component**

Pure presentational component. Receives all data as props, renders the branded paper document with Framer Motion section stagger.

```typescript
// src/phases/ending/IncidentReport.tsx
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
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
  }),
};

export function IncidentReport({
  ending,
  verdict,
  color,
  teamName,
  playerHandle,
  categoryScores,
  remark,
  onPlayAgain,
}: IncidentReportProps) {
  const prefersReduced = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const date = new Date().toLocaleDateString();
  const headerBg = ending === "fired" ? "#7f1d1d" : "#1e293b";

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-y-auto py-8" style={{ background: "#111" }}>
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-[90%] max-w-[520px] rounded overflow-hidden"
        style={{
          background: "#f8f7f4",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* CONFIDENTIAL watermark */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{ transform: "rotate(-35deg)", fontSize: 64, fontWeight: 900, color: "rgba(0,0,0,0.04)", letterSpacing: 12 }}
        >
          CONFIDENTIAL
        </div>

        {/* Header bar */}
        <motion.div
          custom={0} initial="hidden" animate="visible" variants={stagger}
          className="flex justify-between items-center px-6 py-4"
          style={{ background: headerBg, color: "white" }}
        >
          <div>
            <div className="font-bold text-sm tracking-wider" style={{ fontFamily: "sans-serif" }}>
              {teamName.toUpperCase()}
            </div>
            <div className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              Internal Security Division
            </div>
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
                  <span className="font-bold select-none text-sm" style={{ color: "#333", transform: "rotate(-15deg)" }}>
                    SIMULATION — NO REAL DATA
                  </span>
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

        {/* Faded stamp watermark on document */}
        <div
          className="absolute bottom-[60px] right-[30px] rounded-md px-5 py-1.5"
          style={{ border: `3px solid ${color}66`, transform: "rotate(-12deg)" }}
        >
          <div className="font-black tracking-[4px] text-lg" style={{ color: `${color}66` }}>{verdict}</div>
        </div>
      </motion.div>

      {/* Play Again */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        onClick={onPlayAgain}
        className="mt-8 px-8 py-3 rounded-lg text-sm font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
        style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
      >
        Play Again
      </motion.button>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `npm run type-check`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/phases/ending/IncidentReport.tsx
git commit -m "feat(ending): add IncidentReport branded document component"
```

---

### Task 5: Rewrite EndingPage Orchestrator

**Files:**
- Modify: `src/phases/ending/EndingPage.tsx` (full rewrite)
- Modify: `src/app/page.tsx:812-826` (simplify props)

- [ ] **Step 1: Rewrite EndingPage.tsx**

The orchestrator manages the three-act state machine, fires the AI remark request at mount, and delegates rendering to ClassifiedStamp and IncidentReport.

```typescript
// src/phases/ending/EndingPage.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import confetti from "canvas-confetti";
import { deriveFlags, type Ending } from "@/engine/rules";
import { useGameStore } from "@/stores/gameStore";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { ClassifiedStamp } from "./ClassifiedStamp";
import { IncidentReport } from "./IncidentReport";
import { getStaticRemark } from "./analystRemarks";

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
  // Store reads
  const { teamName, playerHandle } = useGameStore((s) => ({ teamName: s.teamName, playerHandle: s.playerHandle }));
  const categoryScores = useScoreStore((s) => s.categoryScores);
  const { decisions, flags } = useNarrativeStore((s) => ({ decisions: s.decisions, flags: s.flags }));
  const { ending } = deriveFlags(decisions, flags);
  const config = VERDICT_CONFIG[ending];

  // Phase state
  const [phase, setPhase] = useState<Phase>("typewriter");
  const [typedChars, setTypedChars] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  // AI remark — fire at mount, resolve before Act 3
  const [remark, setRemark] = useState<string | null>(null);
  const remarkResolved = useRef(false);

  useEffect(() => {
    const flagList = Array.from(flags).join(",");
    fetch(`/api/v1/content/analyst-remark?flags=${encodeURIComponent(flagList)}&handle=${encodeURIComponent(playerHandle || "Analyst")}&verdict=${ending}`)
      .then((r) => r.ok ? r.json() : { remark: "" })
      .then((data) => {
        if (data.remark) {
          remarkResolved.current = true;
          setRemark(data.remark);
        }
      })
      .catch(() => {});
  }, [flags, playerHandle, ending]);

  // Resolved remark: AI if available, otherwise static fallback
  const resolvedRemark = remark || getStaticRemark(flags);

  // Accessibility: skip animations
  const prefersReduced = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReduced) {
      setPhase("report");
    }
  }, [prefersReduced]);

  // Act 1: Typewriter
  useEffect(() => {
    if (phase !== "typewriter" || prefersReduced) return;
    if (typedChars >= TYPEWRITER_LINE.length) {
      const t = setTimeout(() => setPhase("stamp"), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setTypedChars((c) => c + 1), 35);
    return () => clearTimeout(t);
  }, [phase, typedChars, prefersReduced]);

  // Blinking cursor
  useEffect(() => {
    if (phase !== "typewriter") return;
    const i = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(i);
  }, [phase]);

  // Confetti on report phase for promoted/lateral
  useEffect(() => {
    if (phase !== "report") return;
    if (ending === "promoted" || ending === "lateral") {
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: [config.color, "#ffffff", "#fbbf24"],
        });
      }, 800);
    }
  }, [phase, ending, config.color]);

  const handleStampComplete = useCallback(() => {
    setPhase("report");
  }, []);

  return (
    <div className="fixed inset-0 z-[9999]" style={{ background: "#0a0a0a" }}>
      <AnimatePresence mode="wait">
        {/* Act 1: Typewriter */}
        {phase === "typewriter" && (
          <motion.div
            key="typewriter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="fixed inset-0 flex items-center justify-center"
          >
            <div className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              {TYPEWRITER_LINE.slice(0, typedChars)}
              <span style={{ opacity: cursorVisible ? 1 : 0, color: config.color, transition: "opacity 0.1s" }}>|</span>
            </div>
          </motion.div>
        )}

        {/* Act 2: Stamp */}
        {phase === "stamp" && (
          <motion.div
            key="stamp"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
          >
            <ClassifiedStamp
              verdict={config.verdict}
              color={config.color}
              subtitle={config.subtitle}
              onComplete={handleStampComplete}
            />
          </motion.div>
        )}

        {/* Act 3: Incident Report */}
        {phase === "report" && (
          <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <IncidentReport
              ending={ending}
              verdict={config.verdict}
              color={config.color}
              teamName={teamName}
              playerHandle={playerHandle || "Analyst"}
              categoryScores={categoryScores}
              remark={resolvedRemark}
              onPlayAgain={onPlayAgain}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Update page.tsx to pass simplified props**

In `src/app/page.tsx`, change the EndingPage usage (around line 812-826) from:

```tsx
<EndingPage
  ending={deriveFlags(
    useNarrativeStore.getState().decisions,
    useNarrativeStore.getState().flags
  ).ending}
  teamName={useGameStore.getState().teamName}
  fakeDomain={useGameStore.getState().fakeDomain}
  onPlayAgain={() => {
    useScoreStore.getState().reset();
    useNarrativeStore.getState().reset();
    useGameStore.getState().reset();
    setStep("start");
  }}
/>
```

To:

```tsx
<EndingPage
  onPlayAgain={() => {
    useScoreStore.getState().reset();
    useNarrativeStore.getState().reset();
    useGameStore.getState().reset();
    setStep("start");
  }}
/>
```

- [ ] **Step 3: Verify type-check and tests pass**

Run: `npm run type-check && npx vitest run`
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add src/phases/ending/EndingPage.tsx src/app/page.tsx
git commit -m "feat(ending): rewrite EndingPage as three-act orchestrator with stamp + incident report"
```

---

### Task 6: Smoke Test All Endings

**Files:**
- Create: `src/phases/ending/__tests__/EndingPage.test.tsx`

- [ ] **Step 1: Write smoke tests for each verdict variant**

```typescript
// src/phases/ending/__tests__/EndingPage.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { IncidentReport } from "../IncidentReport";

// Test the IncidentReport directly (EndingPage has timers/GSAP that need integration tests)
describe("IncidentReport", () => {
  const baseProps = {
    teamName: "IriusRisk",
    playerHandle: "Nacho",
    categoryScores: { phishingIQ: 23, passwordHygiene: 25, networkSecurity: 20, forensicSkill: 22 },
    remark: "Performed adequately. HR has no further comment at this time.",
    onPlayAgain: vi.fn(),
  };

  it("renders promoted variant with correct branding", () => {
    render(<IncidentReport {...baseProps} ending="promoted" verdict="PROMOTED" color="#22c55e" />);
    expect(screen.getByText("IRIUSRISK")).toBeInTheDocument();
    expect(screen.getByText("Nacho")).toBeInTheDocument();
    // "PROMOTED" appears in personnel row + watermark stamp — both should render
    expect(screen.getAllByText("PROMOTED").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("INCIDENT RESPONSE REPORT")).toBeInTheDocument();
  });

  it("renders fired variant with dark web listing", () => {
    render(<IncidentReport {...baseProps} ending="fired" verdict="FIRED" color="#ef4444" />);
    expect(screen.getByText("[DARK WEB MARKETPLACE]")).toBeInTheDocument();
    expect(screen.getByText(/SIMULATION/)).toBeInTheDocument();
  });

  it("renders lateral variant", () => {
    render(<IncidentReport {...baseProps} ending="lateral" verdict="LATERAL" color="#3b82f6" />);
    expect(screen.getAllByText("LATERAL").length).toBeGreaterThanOrEqual(1);
  });

  it("renders neutral variant", () => {
    render(<IncidentReport {...baseProps} ending="neutral" verdict="NEUTRAL" color="#a1a1aa" />);
    expect(screen.getAllByText("NEUTRAL").length).toBeGreaterThanOrEqual(1);
  });

  it("displays category scores", () => {
    render(<IncidentReport {...baseProps} ending="promoted" verdict="PROMOTED" color="#22c55e" />);
    expect(screen.getByText("23/25")).toBeInTheDocument();
    expect(screen.getByText("25/25")).toBeInTheDocument();
  });

  it("displays analyst remark", () => {
    render(<IncidentReport {...baseProps} ending="promoted" verdict="PROMOTED" color="#22c55e" remark="Test remark here." />);
    expect(screen.getByText(/Test remark here/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/phases/ending/__tests__/`
Expected: all pass

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add src/phases/ending/__tests__/EndingPage.test.tsx
git commit -m "test(ending): add smoke tests for IncidentReport across all verdict variants"
```
