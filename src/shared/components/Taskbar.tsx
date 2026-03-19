"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/stores/gameStore";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const IconEmail = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="14" height="10" rx="1.5" />
    <path d="M1 5l7 5 7-5" />
  </svg>
);

const IconWiki = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="1" width="9" height="14" rx="1" />
    <path d="M5 5h5M5 8h5M5 11h3" />
  </svg>
);

const IconScoreboard = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="9" width="3" height="6" rx="0.5" />
    <rect x="6" y="5" width="3" height="10" rx="0.5" />
    <rect x="11" y="1" width="3" height="14" rx="0.5" />
  </svg>
);

const IconTerminal = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="2" width="14" height="12" rx="1.5" />
    <path d="M4 6l3 3-3 3" />
    <path d="M9 12h3" />
  </svg>
);

const IconTaskManager = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <path d="M8 4v4l3 1.5" />
  </svg>
);

const IconWiFi = () => (
  <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 4.5C3.8 2 7 .8 8 .8c1 0 4.2 1.2 7 3.7" />
    <path d="M3.2 7C5 5.4 6.5 4.7 8 4.7c1.5 0 3 .7 4.8 2.3" />
    <path d="M5.5 9.5C6.4 8.7 7.2 8.3 8 8.3c.8 0 1.6.4 2.5 1.2" />
    <circle cx="8" cy="12.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

interface TaskbarApp {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const CORPORATE_APPS: TaskbarApp[] = [
  { id: "email", label: "Email", icon: <IconEmail /> },
  { id: "wiki", label: "Wiki", icon: <IconWiki /> },
  { id: "scoreboard", label: "Scoreboard", icon: <IconScoreboard /> },
];

const BREACH_APPS: TaskbarApp[] = [
  { id: "email", label: "Email", icon: <IconEmail /> },
  { id: "terminal", label: "Terminal", icon: <IconTerminal /> },
  { id: "taskmanager", label: "Task Manager", icon: <IconTaskManager /> },
  { id: "scoreboard", label: "Scoreboard", icon: <IconScoreboard /> },
];

interface TaskbarProps {
  onAppClick: (appId: string) => void;
  activeApp?: string;
  availableWindowIds?: string[];
}

export function Taskbar({ onAppClick, activeApp, availableWindowIds }: TaskbarProps) {
  const visualMode = useGameStore((s) => s.visualMode);
  const phase = useGameStore((s) => s.phase);
  const teamName = useGameStore((s) => s.teamName);
  const logoUrl = useGameStore((s) => s.logoUrl);
  const [time, setTime] = useState("");

  const isBreach = visualMode === "breach";

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    update();
    const interval = setInterval(update, 10_000);
    return () => clearInterval(interval);
  }, []);

  const baseApps = isBreach ? BREACH_APPS : CORPORATE_APPS;
  const apps = availableWindowIds
    ? baseApps.filter((app) => availableWindowIds.includes(app.id))
    : baseApps;

  return (
    <motion.div
      initial={{ y: 50 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed bottom-0 left-0 right-0 h-11 flex items-center px-3 z-50 select-none border-t border-[var(--taskbar-border)]"
      style={{ background: "var(--taskbar-bg)" }}
    >
      {/* Left area: alert dot (breach) + company/incident label + team name */}
      <div className="flex items-center gap-2 mr-4">
        <AnimatePresence>
          {isBreach && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0 }}
              className="w-2 h-2 rounded-full bg-[var(--accent-red)]"
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </AnimatePresence>
        {logoUrl && !isBreach && (
          <motion.img
            src={logoUrl}
            alt={teamName}
            className="h-5 w-5 rounded object-contain"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          />
        )}
        <motion.span
          className="font-bold text-sm tracking-wide"
          style={{ color: "var(--taskbar-text-active)" }}
          layoutId="taskbar-label"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          {isBreach ? "INCIDENT RESPONSE" : teamName}
        </motion.span>
        <AnimatePresence>
          {isBreach && phase !== "debrief" && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: 10 }}
              className="text-[10px] font-mono text-[var(--accent-red)]"
            >
              [BREACH DETECTED]
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* App icons */}
      <div className="flex gap-1 flex-1">
        {apps.map((app, index) => (
          <motion.button
            key={app.id}
            onClick={() => onAppClick(app.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            animate={{
              scale: activeApp === app.id ? 1.1 : 1,
              y: activeApp === app.id ? -2 : 0,
            }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`
              px-2.5 py-1.5 rounded-lg text-xs transition-colors ring-2 ring-transparent focus:ring-[var(--accent-ring)]
              ${isBreach ? "font-mono" : ""}
            `}
            style={
              activeApp === app.id
                ? isBreach
                  ? { background: "var(--accent-subtle)", border: "1px solid var(--border)", color: "var(--taskbar-text-active)" }
                  : { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", color: "var(--taskbar-text-active)" }
                : { background: "transparent", color: "var(--taskbar-text)" }
            }
            title={app.label}
          >
            <motion.span
              className="inline-flex items-center justify-center w-4 h-4 text-center mr-1"
              animate={activeApp === app.id}
              transition={{ duration: 0.5 }}
            >
              {app.icon}
            </motion.span>
            <span className="hidden sm:inline">{app.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Right tray */}
      <div className="flex items-center gap-3 text-xs text-[var(--taskbar-text)]">
        <motion.span
          title="Wi-Fi"
          className="opacity-70 cursor-pointer"
          whileHover={{ scale: 1.1, opacity: 1 }}
          whileTap={{ scale: 0.95 }}
        >
          <IconWiFi />
        </motion.span>
        <motion.span
          className={`opacity-70 ${isBreach ? "font-mono text-[var(--accent)]" : "font-sans"}`}
          key={time}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {time}
        </motion.span>
      </div>
    </motion.div>
  );
}
