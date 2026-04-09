"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/stores/gameStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useScoreStore } from "@/stores/scoreStore";
import { CATEGORY_NOMINAL_MAX } from "@/engine/scoring";
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

function signalToBars(dbm: number): 1 | 2 | 3 | 4 {
  if (dbm >= -50) return 4;
  if (dbm >= -60) return 3;
  if (dbm >= -70) return 2;
  return 1;
}

function IconWiFiSignal({ bars = 3, color = "currentColor" }: { bars?: 1 | 2 | 3 | 4; color?: string }) {
  const dim = "rgba(255,255,255,0.2)";
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4.5C3.8 2 7 .8 8 .8c1 0 4.2 1.2 7 3.7"   stroke={bars >= 4 ? color : dim} strokeWidth="1.5" />
      <path d="M3.2 7C5 5.4 6.5 4.7 8 4.7c1.5 0 3 .7 4.8 2.3" stroke={bars >= 3 ? color : dim} strokeWidth="1.5" />
      <path d="M5.5 9.5C6.4 8.7 7.2 8.3 8 8.3c.8 0 1.6.4 2.5 1.2" stroke={bars >= 2 ? color : dim} strokeWidth="1.5" />
      <circle cx="8" cy="12.5" r="1" fill={bars >= 1 ? color : dim} stroke="none" />
    </svg>
  );
}

const IconSlack = () => (
  <svg width="15" height="15" viewBox="0 0 240 240" fill="none">
    <path d="M99.4 151.2c0 7.1-5.8 12.9-12.9 12.9-7.1 0-12.9-5.8-12.9-12.9 0-7.1 5.8-12.9 12.9-12.9H99.4v12.9z" fill="#E01E5A"/>
    <path d="M105.9 151.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9v-32.3z" fill="#E01E5A"/>
    <path d="M118.8 99.4c-7.1 0-12.9-5.8-12.9-12.9 0-7.1 5.8-12.9 12.9-12.9 7.1 0 12.9 5.8 12.9 12.9V99.4h-12.9z" fill="#36C5F0"/>
    <path d="M118.8 105.9c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H86.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3z" fill="#36C5F0"/>
    <path d="M170.6 118.8c0-7.1 5.8-12.9 12.9-12.9 7.1 0 12.9 5.8 12.9 12.9 0 7.1-5.8 12.9-12.9 12.9h-12.9v-12.9z" fill="#2EB67D"/>
    <path d="M164.1 118.8c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V86.5c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3z" fill="#2EB67D"/>
    <path d="M151.2 170.6c7.1 0 12.9 5.8 12.9 12.9 0 7.1-5.8 12.9-12.9 12.9-7.1 0-12.9-5.8-12.9-12.9v-12.9h12.9z" fill="#ECB22E"/>
    <path d="M151.2 164.1c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9h-32.3z" fill="#ECB22E"/>
  </svg>
);

const IconPower = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M7 1v5" />
    <path d="M3.5 3.5A5.5 5.5 0 1 0 10.5 3.5" />
  </svg>
);

const CATEGORY_BAR_COLORS: Record<string, string> = {
  phishingIQ:       "bg-[var(--info)]",
  passwordHygiene:  "bg-[var(--success)]",
  networkSecurity:  "bg-[var(--warning)]",
  forensicSkill:    "bg-[var(--accent)]",
};

const CATEGORY_LABELS: Record<string, string> = {
  phishingIQ:      "Phishing IQ",
  passwordHygiene: "Password Hygiene",
  networkSecurity: "Network Security",
  forensicSkill:   "Forensic Skill",
};

interface FloatingLabel {
  id: number;
  delta: number;
}

interface TaskbarApp {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** panel = toggle on/off; window = focus only */
  kind?: "window" | "panel";
}

const CORPORATE_APPS: TaskbarApp[] = [
  { id: "email",      label: "Email",      icon: <IconEmail />,      kind: "window" },
  { id: "messages",   label: "Messages",   icon: <IconSlack />,      kind: "panel" },
  { id: "wiki",       label: "Wiki",       icon: <IconWiki />,       kind: "panel" },
  { id: "scoreboard", label: "Scoreboard", icon: <IconScoreboard />, kind: "panel" },
];

const BREACH_APPS: TaskbarApp[] = [
  { id: "email",       label: "Email",        icon: <IconEmail />,       kind: "window" },
  { id: "terminal",    label: "Terminal",     icon: <IconTerminal />,    kind: "window" },
  { id: "taskmanager", label: "Task Manager", icon: <IconTaskManager />, kind: "window" },
  { id: "scoreboard",  label: "Scoreboard",   icon: <IconScoreboard />,  kind: "panel" },
];

interface TaskbarProps {
  onAppClick: (appId: string) => void;
  activeApp?: string;
  availableWindowIds?: string[];
  onExit?: () => void;
}

export function Taskbar({ onAppClick, activeApp, availableWindowIds, onExit }: TaskbarProps) {
  const visualMode = useGameStore((s) => s.visualMode);
  const phase = useGameStore((s) => s.phase);
  const teamName = useGameStore((s) => s.teamName);
  const logoUrl = useGameStore((s) => s.logoUrl);
  const decisions = useNarrativeStore((s) => s.decisions);
  const trustScore = useScoreStore((s) => s.trustScore);
  const categoryScores = useScoreStore((s) => s.categoryScores);
  const [time, setTime] = useState("");
  const [showWifiTooltip, setShowWifiTooltip] = useState(false);
  const [showScoreTooltip, setShowScoreTooltip] = useState(false);
  const [floats, setFloats] = useState<FloatingLabel[]>([]);
  const prevTrust = useRef(trustScore);
  const nextFloatId = useRef(0);

  const wifiChoice = decisions.wifi_choice as "evil_twin" | "legitimate" | undefined;
  const wifiSsid   = decisions.wifi_ssid;
  const wifiAuth   = decisions.wifi_auth;
  const wifiSignal = decisions.wifi_signal ? parseInt(decisions.wifi_signal, 10) : null;
  const wifiBars   = wifiSignal !== null ? signalToBars(wifiSignal) : 3;
  const wifiColor  = wifiChoice === "evil_twin" ? "var(--danger)" : wifiChoice === "legitimate" ? "var(--success)" : "currentColor";

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

  useEffect(() => {
    const delta = trustScore - prevTrust.current;
    prevTrust.current = trustScore;
    if (delta === 0) return;
    const id = nextFloatId.current++;
    setFloats((f) => [...f, { id, delta }]);
    const t = setTimeout(() => setFloats((f) => f.filter((fl) => fl.id !== id)), 1200);
    return () => clearTimeout(t);
  }, [trustScore]);

  const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);

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
      <div className="flex gap-1 flex-1 items-center">
        {apps.map((app, index) => {
          const isActive = activeApp === app.id;
          const isPanel = app.kind === "panel";
          // Insert a separator before the first panel app
          const prevApp = apps[index - 1];
          const showSeparator = isPanel && (!prevApp || prevApp.kind !== "panel");

          return (
            <React.Fragment key={app.id}>
              {showSeparator && (
                <div
                  className="w-px h-5 mx-1 shrink-0"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                />
              )}
              <motion.button
                onClick={() => onAppClick(app.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -2 : 0,
                }}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{
                  delay: index * 0.05,
                  duration: 0.3,
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
                className={`
                  px-2.5 py-1.5 rounded-lg text-xs transition-colors ring-2 ring-transparent focus:ring-[var(--accent-ring)]
                  ${isBreach ? "font-mono" : ""}
                `}
                style={
                  isActive
                    ? isBreach
                      ? { background: "var(--accent-subtle)", border: "1px solid var(--border)", color: "var(--taskbar-text-active)" }
                      : { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", color: "#ffffff" }
                    : { background: "transparent", color: "var(--taskbar-text)" }
                }
                title={app.label}
              >
                <motion.span
                  className="inline-flex items-center justify-center w-4 h-4 text-center mr-1"
                  transition={{ duration: 0.5 }}
                >
                  {app.icon}
                </motion.span>
                <span className="hidden sm:inline">{app.label}</span>
              </motion.button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Right tray */}
      <div className="flex items-center gap-3 text-xs text-[var(--taskbar-text)]">

        {/* Score widget */}
        <div
          className="relative flex items-center gap-2 border-l border-r border-[rgba(255,255,255,0.08)] px-3"
          onMouseEnter={() => setShowScoreTooltip(true)}
          onMouseLeave={() => setShowScoreTooltip(false)}
        >
          {/* Trust number */}
          <div className="flex flex-col items-center leading-none gap-[1px]">
            <span className="text-[8px] uppercase tracking-wide opacity-50">Trust</span>
            <motion.span
              className="text-[11px] font-bold font-mono"
              style={{ color: trustScore >= 50 ? "var(--success)" : "var(--danger)" }}
              key={trustScore}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 500 }}
            >
              {trustScore}
            </motion.span>
          </div>
          {/* 4 mini category bars */}
          <div className="flex flex-col gap-[3px] w-[52px]">
            <div className="text-[8px] font-mono opacity-50 leading-none">{totalScore}/100</div>
            {(Object.keys(CATEGORY_BAR_COLORS) as Array<keyof typeof categoryScores>).map((cat) => {
              const score = categoryScores[cat];
              const width = `${Math.min(100, (score / CATEGORY_NOMINAL_MAX[cat]) * 100)}%`;
              return (
                <div key={cat} className="h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <motion.div
                    className={`h-full rounded-full ${CATEGORY_BAR_COLORS[cat]}`}
                    initial={{ width: "0%" }}
                    animate={{ width }}
                    transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                </div>
              );
            })}
          </div>
          {/* Floating delta labels */}
          <AnimatePresence mode="popLayout">
            {floats.map((f) => (
              <motion.span
                key={f.id}
                initial={{ opacity: 1, y: 0, scale: 0.8 }}
                animate={{ opacity: 0, y: -28, scale: 1.1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
                className={`absolute -top-1 left-1/2 -translate-x-1/2 text-xs font-bold pointer-events-none ${
                  isBreach
                    ? f.delta > 0 ? "text-[var(--accent)]" : "text-[var(--accent-red)]"
                    : f.delta > 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
                }`}
                style={{ textShadow: isBreach ? "0 0 8px currentColor" : undefined }}
              >
                {f.delta > 0 ? "+" : ""}{f.delta}
              </motion.span>
            ))}
          </AnimatePresence>
          {/* Score breakdown tooltip */}
          <AnimatePresence>
            {showScoreTooltip && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-9 right-0 rounded-lg p-2.5 text-[10px] whitespace-nowrap z-50 shadow-xl pointer-events-none"
                style={{
                  background: isBreach ? "#0a0e14" : "#1e293b",
                  border: "1px solid var(--border)",
                  color: "#f1f5f9",
                }}
              >
                {(Object.keys(categoryScores) as Array<keyof typeof categoryScores>).map((cat) => (
                  <div key={cat} className="flex justify-between gap-4 py-[1px]">
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>{CATEGORY_LABELS[cat]}</span>
                    <span className="font-mono">{categoryScores[cat]}</span>
                  </div>
                ))}
                <div className="border-t mt-1.5 pt-1.5 flex justify-between gap-4" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Trust</span>
                  <span className="font-mono">{trustScore}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* WiFi indicator with tooltip */}
        <div className="relative">
          <motion.span
            className="opacity-70 cursor-default flex items-center"
            whileHover={{ opacity: 1 }}
            onMouseEnter={() => setShowWifiTooltip(true)}
            onMouseLeave={() => setShowWifiTooltip(false)}
            style={{ color: wifiColor }}
          >
            <IconWiFiSignal bars={wifiBars} color={wifiColor} />
          </motion.span>

          <AnimatePresence>
            {showWifiTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-8 right-0 z-50 min-w-[160px] rounded-lg border shadow-xl overflow-hidden"
                style={{
                  background: isBreach ? "#0a0e14" : "#1e293b",
                  borderColor: isBreach ? "var(--border)" : "rgba(255,255,255,0.1)",
                }}
              >
                {wifiSsid ? (
                  <>
                    <div className="px-3 pt-2.5 pb-1">
                      <div className="flex items-center gap-2 mb-1">
                        <IconWiFiSignal bars={wifiBars} color={wifiColor} />
                        <span className="font-semibold text-white text-[12px] truncate">{wifiSsid}</span>
                      </div>
                      {wifiChoice === "evil_twin" && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(255,51,85,0.2)", color: "var(--danger)" }}>
                          Evil Twin — Compromised
                        </span>
                      )}
                      {wifiChoice === "legitimate" && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(0,229,51,0.12)", color: "var(--success)" }}>
                          Secure
                        </span>
                      )}
                    </div>
                    <div className="px-3 pb-2.5 space-y-0.5 border-t mt-1.5"
                      style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                      <div className="flex justify-between text-[11px] pt-1.5">
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>Signal</span>
                        <span className="font-mono" style={{ color: "rgba(255,255,255,0.75)" }}>
                          {wifiSignal} dBm
                        </span>
                      </div>
                      {wifiAuth && (
                        <div className="flex justify-between text-[11px]">
                          <span style={{ color: "rgba(255,255,255,0.4)" }}>Security</span>
                          <span className="font-mono text-right" style={{ color: "rgba(255,255,255,0.75)", maxWidth: "100px" }}>
                            {wifiAuth}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="px-3 py-2 text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Not connected
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <motion.span
          className={`opacity-70 ${isBreach ? "font-mono text-[var(--accent)]" : "font-sans"}`}
          key={time}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {time}
        </motion.span>

        {/* Exit to lobby */}
        {onExit && (
          <motion.button
            onClick={onExit}
            className="opacity-40 hover:opacity-90 transition-opacity p-1 rounded hover:bg-[rgba(255,255,255,0.08)]"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Exit to lobby"
            style={{ color: "var(--taskbar-text)" }}
          >
            <IconPower />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
