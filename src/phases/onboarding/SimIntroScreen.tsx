"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";

const TYPEWRITER_LINES = [
  "> INITIALIZING SIMULATION ENVIRONMENT...",
  "> OPERATOR CREDENTIALS VERIFIED.",
  "> SIMULATION ACTIVE.",
];

interface SimIntroScreenProps {
  onComplete: () => void;
}

export function SimIntroScreen({ onComplete }: SimIntroScreenProps) {
  const teamName = useGameStore((s) => s.teamName);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [phase, setPhase] = useState<"typewriter" | "hired">(
    prefersReduced ? "hired" : "typewriter"
  );
  const [visibleLines, setVisibleLines] = useState<string[]>(
    prefersReduced ? TYPEWRITER_LINES : []
  );
  const [currentLineText, setCurrentLineText] = useState("");
  const [lineIndex, setLineIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const charIndexRef = useRef(0);

  const initials = teamName.slice(0, 2).toUpperCase();

  // Blinking cursor
  useEffect(() => {
    if (phase !== "typewriter") return;
    const interval = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(interval);
  }, [phase]);

  // Typewriter effect
  useEffect(() => {
    if (prefersReduced || phase !== "typewriter") return;
    if (lineIndex >= TYPEWRITER_LINES.length) {
      // All lines done — hold cursor visible on last line for 500ms then advance
      const timeout = setTimeout(() => setPhase("hired"), 500);
      return () => clearTimeout(timeout);
    }

    const line = TYPEWRITER_LINES[lineIndex];
    charIndexRef.current = 0;
    setCurrentLineText("");

    const interval = setInterval(() => {
      charIndexRef.current += 1;
      const next = line.slice(0, charIndexRef.current);
      setCurrentLineText(next);
      if (charIndexRef.current >= line.length) {
        clearInterval(interval);
        setVisibleLines((prev) => [...prev, line]);
        setCurrentLineText("");
        setLineIndex((i) => i + 1);
      }
    }, 28);

    return () => clearInterval(interval);
  }, [lineIndex, phase, prefersReduced]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <AnimatePresence mode="wait">
        {phase === "typewriter" && (
          <motion.div
            key="typewriter"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-lg px-8 font-mono text-sm space-y-2"
            style={{ color: "var(--accent)" }}
          >
            {visibleLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {/* Current line being typed, or cursor held on last line */}
            <div>
              {lineIndex < TYPEWRITER_LINES.length
                ? currentLineText
                : TYPEWRITER_LINES[TYPEWRITER_LINES.length - 1]}
              <span style={{ opacity: showCursor ? 1 : 0 }}>█</span>
            </div>
          </motion.div>
        )}

        {phase === "hired" && (
          <motion.div
            key="hired"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center gap-6 px-8 text-center max-w-sm"
          >
            {/* Company badge */}
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-black font-black text-2xl select-none"
              style={{ background: "var(--accent)" }}
            >
              {initials}
            </div>

            {/* Heading */}
            <div>
              <div
                className="text-[10px] font-bold tracking-[0.3em] uppercase mb-2"
                style={{ color: "var(--accent)" }}
              >
                New Employment Notification
              </div>
              <h1
                className="text-2xl font-black tracking-tight"
                style={{ color: "var(--text-primary, #fff)" }}
              >
                WELCOME TO {teamName.toUpperCase()}
              </h1>
            </div>

            {/* Body */}
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--text-secondary, rgba(255,255,255,0.6))" }}
            >
              You&apos;ve been hired as a{" "}
              <strong style={{ color: "var(--text-primary, #fff)" }}>
                Security Analyst
              </strong>
              . Report to the IT Security division immediately. Your credentials
              have been provisioned. Do not share them.
            </p>

            {/* CTA */}
            <button
              onClick={onComplete}
              className="mt-2 px-8 py-3 rounded-xl font-bold text-xs tracking-[0.2em] uppercase transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: "var(--accent)", color: "#000" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.filter =
                  "brightness(1.15)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.filter = "")
              }
            >
              Enter Portal →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
