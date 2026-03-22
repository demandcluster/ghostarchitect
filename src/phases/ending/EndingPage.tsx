"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Ending } from "@/engine/rules";

interface EndingPageProps {
  ending: Ending;
  teamName: string;
  fakeDomain: string;
  onPlayAgain: () => void;
}

const ENDING_CONFIG: Record<
  Ending,
  {
    color: string;
    letter: string;
    verdict: string;
    subtitle: string;
    lines: string[];
    narrative: string;
    cliffhanger: string;
  }
> = {
  promoted: {
    color: "#22c55e",
    letter: "P",
    verdict: "PROMOTED",
    subtitle: "Senior Security Analyst",
    lines: [
      "The breach was contained in 47 minutes.",
      "Zero data exfiltrated.",
      "The CISO has requested a meeting.",
    ],
    narrative:
      "Your exceptional response to the Ghost Architect breach has earned recognition from the CISO. Your methodical approach — quick containment, thorough IOC extraction, and proper escalation — set the standard for incident response.",
    cliffhanger:
      "Three months later, a familiar pattern resurfaces...",
  },
  lateral: {
    color: "#3b82f6",
    letter: "L",
    verdict: "LATERAL",
    subtitle: "Security Operations Transfer",
    lines: [
      "The breach was contained. Mostly.",
      "Some gaps in your response were noted.",
      "Management wants to discuss your next assignment.",
    ],
    narrative:
      "Your response showed promise but had gaps. Management has moved you to the SOC team where you can develop your incident response skills with more structured mentorship. Your potential was noted.",
    cliffhanger:
      "The SOC monitor pings. Something familiar in the logs...",
  },
  neutral: {
    color: "#a1a1aa",
    letter: "N",
    verdict: "NEUTRAL",
    subtitle: "Investigation Concluded",
    lines: [
      "The breach is over. The damage was... acceptable.",
      "Your report sits in a queue of twelve.",
      "Nobody's called. Nobody's complained.",
    ],
    narrative:
      "The breach was contained, but your response had both strengths and weaknesses. Management appreciates your effort but recommends additional security training.",
    cliffhanger:
      "A mandatory training invite appears in your inbox...",
  },
  fired: {
    color: "#ef4444",
    letter: "F",
    verdict: "FIRED",
    subtitle: "Termination Notice",
    lines: [
      "The exfiltration ran for 6 hours undetected.",
      "4,500 employee records. Gone.",
      "HR has scheduled a meeting.",
    ],
    narrative:
      "Critical warning signs were missed during the initial breach window. The breach resulted in the exfiltration of over 4,500 employee records. The IT department has been restructured.",
    cliffhanger:
      "BREAKING: Employee records surface on dark web marketplace...",
  },
};

type Phase = "blackout" | "typewriter" | "reveal";

export function EndingPage({
  ending,
  teamName,
  onPlayAgain,
}: EndingPageProps) {
  const [phase, setPhase] = useState<Phase>("blackout");
  const [visibleLines, setVisibleLines] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  const config = ENDING_CONFIG[ending];

  // Blackout → typewriter after 1s
  useEffect(() => {
    const t = setTimeout(() => setPhase("typewriter"), 1000);
    return () => clearTimeout(t);
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (phase !== "typewriter") return;
    if (visibleLines >= config.lines.length) {
      // All lines done, wait 1.5s then reveal card
      const t = setTimeout(() => setPhase("reveal"), 1500);
      return () => clearTimeout(t);
    }

    const currentLine = config.lines[visibleLines];
    if (typedChars >= currentLine.length) {
      // Line complete, pause then start next
      const t = setTimeout(() => {
        setVisibleLines((v) => v + 1);
        setTypedChars(0);
      }, 1200);
      return () => clearTimeout(t);
    }

    // Type next char
    const t = setTimeout(() => setTypedChars((c) => c + 1), 35);
    return () => clearTimeout(t);
  }, [phase, visibleLines, typedChars, config.lines]);

  // Blinking cursor
  useEffect(() => {
    if (phase !== "typewriter") return;
    const i = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(i);
  }, [phase]);

  const handlePlayAgain = useCallback(() => {
    onPlayAgain();
  }, [onPlayAgain]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "#000" }}
    >
      <AnimatePresence mode="wait">
        {/* Typewriter phase */}
        {phase === "typewriter" && (
          <motion.div
            key="typewriter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center gap-4 px-8"
            style={{ maxWidth: 600 }}
          >
            {config.lines.slice(0, visibleLines + 1).map((line, i) => (
              <div
                key={i}
                className="font-mono text-sm md:text-base"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                {i < visibleLines
                  ? line
                  : line.slice(0, typedChars)}
                {i === visibleLines && (
                  <span
                    style={{
                      opacity: cursorVisible ? 1 : 0,
                      color: config.color,
                      transition: "opacity 0.1s",
                    }}
                  >
                    |
                  </span>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Card reveal phase */}
        {phase === "reveal" && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center gap-8 px-6"
            style={{ maxWidth: 640 }}
          >
            {/* Split card */}
            <div
              className="w-full rounded-xl overflow-hidden flex"
              style={{
                background: "#0a0a0a",
                border: `1px solid ${config.color}40`,
                minHeight: 220,
              }}
            >
              {/* Left — verdict stamp */}
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: "38%",
                  borderRight: `1px solid ${config.color}18`,
                  background: `radial-gradient(ellipse at center, ${config.color}0a 0%, transparent 70%)`,
                }}
              >
                <div className="text-center">
                  <div
                    className="font-black leading-none"
                    style={{
                      fontSize: 72,
                      color: `${config.color}1a`,
                    }}
                  >
                    {config.letter}
                  </div>
                  <div
                    className="font-bold -mt-2"
                    style={{
                      fontSize: 18,
                      color: config.color,
                      letterSpacing: 3,
                    }}
                  >
                    {config.verdict}
                  </div>
                  <div
                    className="mx-auto mt-2 rounded-full"
                    style={{
                      width: 40,
                      height: 2,
                      background: config.color,
                    }}
                  />
                </div>
              </div>

              {/* Right — narrative */}
              <div className="flex-1 p-6 flex flex-col justify-center">
                <div
                  className="text-[10px] uppercase tracking-[3px] mb-2"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {config.subtitle}
                </div>
                <div
                  className="text-xs leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  {config.narrative}
                </div>

                {/* Fired ending extra: dark web listing */}
                {ending === "fired" && (
                  <div
                    className="mt-3 p-3 rounded-md relative overflow-hidden"
                    style={{
                      background: "#0d1117",
                      border: "1px solid #333",
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span
                        className="font-bold select-none"
                        style={{
                          fontSize: 14,
                          color: "#333",
                          transform: "rotate(-15deg)",
                        }}
                      >
                        SIMULATION — NO REAL DATA
                      </span>
                    </div>
                    <div className="relative z-10 font-mono text-[10px] space-y-0.5">
                      <div style={{ color: "#e63946" }}>
                        [DARK WEB MARKETPLACE]
                      </div>
                      <div style={{ color: "#c9d1d9" }}>
                        Listing: {teamName} Employee Database (4,500 records)
                      </div>
                      <div style={{ color: "#c9d1d9" }}>Price: 0.15 BTC</div>
                      <div style={{ color: "#c9d1d9" }}>
                        Sample: Doe, Jane | SSN: 9XX-XX-XXXX
                      </div>
                    </div>
                  </div>
                )}

                {/* Cliffhanger teaser */}
                <div
                  className="mt-3 px-3 py-2 rounded-md"
                  style={{
                    background: `${config.color}08`,
                    border: `1px solid ${config.color}25`,
                  }}
                >
                  <div
                    className="text-[11px] italic"
                    style={{ color: `${config.color}99` }}
                  >
                    {config.cliffhanger}
                  </div>
                </div>
              </div>
            </div>

            {/* Play Again */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              onClick={handlePlayAgain}
              className="px-8 py-3 rounded-lg text-sm font-semibold transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: `${config.color}18`,
                color: config.color,
                border: `1px solid ${config.color}30`,
              }}
            >
              Play Again
            </motion.button>

            {/* Credits */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="text-center mt-4 space-y-1.5"
            >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
