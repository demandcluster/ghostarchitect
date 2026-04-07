"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DMMessage, DMChoice } from "@/content/types";
import { useGameStore } from "@/stores/gameStore";

// Official Slack logo paths
const SlackLogo = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 240 240" fill="none">
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

function formatTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

interface DMSidebarProps {
  messages: DMMessage[];
  onChoice: (messageId: string, choice: DMChoice) => void;
  revealUpTo?: number;
  revealedIds?: string[];
}

export function DMSidebar({
  messages,
  onChoice,
  revealUpTo = 0,
  revealedIds = [],
}: DMSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const visualMode = useGameStore((s) => s.visualMode);
  const isBreach = visualMode === "breach";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, revealedIds]);

  const visibleMessages = messages.filter(
    (m, i) => i < revealUpTo || revealedIds.includes(m.id)
  );

  const firstSender = visibleMessages[0]?.sender ?? "";

  if (isBreach) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--bg-secondary)" }}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-5 scroll-smooth">
          <AnimatePresence mode="popLayout">
            {visibleMessages.map((msg) => (
              <DMBubbleTerminal key={msg.id} message={msg} onChoice={onChoice} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Corporate: Slack-style
  return (
    <div className="flex flex-col h-full" style={{ background: "#1A1D21" }}>
      {/* Direct Messages section */}
      <div style={{
        padding: "10px 10px 6px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <svg width="9" height="9" viewBox="0 0 9 9" style={{ opacity: 0.4, flexShrink: 0 }}>
            <polygon points="0,0 9,4.5 0,9" fill="white" />
          </svg>
          <span style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}>
            Direct Messages
          </span>
          <div style={{ marginLeft: "auto", opacity: 0.35 }}>
            <SlackLogo size={14} />
          </div>
        </div>

        {firstSender && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2BAC76", flexShrink: 0 }} />
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "13px", fontWeight: "500" }}>
              {firstSender}
            </span>
          </div>
        )}
      </div>

      {/* Messages feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth" style={{ paddingTop: "6px", paddingBottom: "4px" }}>
        <AnimatePresence mode="popLayout">
          {visibleMessages.map((msg) => (
            <DMBubbleSlack key={msg.id} message={msg} onChoice={onChoice} />
          ))}
        </AnimatePresence>
      </div>

      {/* Decorative input bar */}
      <div style={{ padding: "8px 10px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "6px",
          padding: "7px 10px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          <span style={{ color: "rgba(255,255,255,0.22)", fontSize: "12px", flex: 1 }}>
            {firstSender ? `Message ${firstSender}` : "Send a message"}
          </span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2L2 8l5 2 2 5 5-13z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// Slack-style flat message
function DMBubbleSlack({
  message,
  onChoice,
}: {
  message: DMMessage;
  onChoice: (messageId: string, choice: DMChoice) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [shuffledChoices, setShuffledChoices] = useState<DMChoice[]>([]);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setShuffledChoices(message.choices ? [...message.choices].sort(() => Math.random() - 0.5) : []);
      setChosen(null);
      setImgError(false);
    });
    return () => { active = false; };
  }, [message.id, message.choices]);

  const handleChoice = (choice: DMChoice) => {
    if (chosen) return;
    setChosen(choice.id);
    onChoice(message.id, choice);
  };

  const isUrl = message.avatar &&
    (message.avatar.startsWith("http") || message.avatar.startsWith("/")) &&
    message.avatar.length > 4 &&
    !imgError;

  // Consistent avatar color per sender
  const AVATAR_COLORS = ["#E01E5A", "#36C5F0", "#2EB67D", "#ECB22E", "#7B68EE", "#FF6B6B", "#1264A3"];
  const avatarBg = AVATAR_COLORS[message.sender.charCodeAt(0) % AVATAR_COLORS.length];
  const displayInitial = message.avatar && message.avatar.length <= 3
    ? message.avatar
    : (message.sender?.charAt(0)?.toUpperCase() || "?");

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div
        className="flex items-start gap-2.5 px-3 py-1.5 transition-colors"
        style={{ background: hovered ? "rgba(255,255,255,0.03)" : "transparent" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* 32px Slack-style avatar */}
        <div className="shrink-0" style={{ width: "32px", height: "32px", marginTop: "3px" }}>
          {isUrl ? (
            <img
              src={message.avatar}
              alt={message.sender}
              onError={() => setImgError(true)}
              style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "32px", height: "32px", borderRadius: "6px",
              background: avatarBg,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: "13px", fontWeight: "700",
            }}>
              {displayInitial}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name + role + time */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
            <span style={{ color: "white", fontSize: "14px", fontWeight: "700", lineHeight: 1.2 }}>
              {message.sender}
            </span>
            <span style={{
              color: "rgba(255,255,255,0.38)",
              fontSize: "10px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              {message.senderRole}
            </span>
            {message.timestamp ? (
              <span style={{ color: "rgba(255,255,255,0.22)", fontSize: "11px", marginLeft: "auto" }}>
                {formatTime(message.timestamp)}
              </span>
            ) : null}
          </div>

          {/* Message text */}
          <p style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: "14px",
            lineHeight: "1.55",
            margin: 0,
            wordBreak: "break-word",
          }}>
            {message.text}
          </p>

          {/* Interactive choices */}
          {shuffledChoices.length > 0 && !chosen && (
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "7px" }}>
              {shuffledChoices.map((choice) => (
                <motion.button
                  key={choice.id}
                  onClick={() => handleChoice(choice)}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(100,170,255,0.5)" }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: "block",
                    width: "100%",
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "6px",
                    padding: "10px 12px",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: "13px",
                    fontWeight: "400",
                    textAlign: "left",
                    cursor: "pointer",
                    lineHeight: 1.5,
                  }}
                >
                  {choice.label}
                </motion.button>
              ))}
            </div>
          )}

          {/* Post-choice feedback */}
          <AnimatePresence>
            {chosen && (() => {
              const choice = message.choices?.find(c => c.id === chosen);
              if (!choice) return null;
              const delta = choice.scoreEffect?.points ?? 0;
              const correct = choice.isCorrect;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: "10px" }}
                >
                  {/* Chosen answer */}
                  <div style={{
                    background: correct ? "rgba(43,172,118,0.15)" : "rgba(224,30,90,0.15)",
                    border: `1px solid ${correct ? "rgba(43,172,118,0.35)" : "rgba(224,30,90,0.35)"}`,
                    borderRadius: "6px",
                    padding: "8px 12px",
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.85)",
                    lineHeight: 1.5,
                    marginBottom: "6px",
                  }}>
                    {choice.label}
                  </div>
                  {/* Verdict row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: correct ? "#2BAC76" : "#E01E5A",
                    }}>
                      {correct ? "✓ Correct" : "✗ Incorrect"}
                    </span>
                    {delta !== 0 && (
                      <span style={{
                        fontSize: "12px", fontWeight: "700",
                        padding: "2px 7px", borderRadius: "4px",
                        background: delta > 0 ? "rgba(43,172,118,0.2)" : "rgba(224,30,90,0.2)",
                        color: delta > 0 ? "#2BAC76" : "#E01E5A",
                      }}>
                        {delta > 0 ? `+${delta}` : delta} trust
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// Terminal-style message for breach mode
function DMBubbleTerminal({
  message,
  onChoice,
}: {
  message: DMMessage;
  onChoice: (messageId: string, choice: DMChoice) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [shuffledChoices, setShuffledChoices] = useState<DMChoice[]>([]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setShuffledChoices(message.choices ? [...message.choices].sort(() => Math.random() - 0.5) : []);
      setChosen(null);
      setImgError(false);
    });
    return () => { active = false; };
  }, [message.id, message.choices]);

  const handleChoice = (choice: DMChoice) => {
    if (chosen) return;
    setChosen(choice.id);
    onChoice(message.id, choice);
  };

  const isUrl = message.avatar &&
    (message.avatar.startsWith("http") || message.avatar.startsWith("/")) &&
    message.avatar.length > 4 &&
    !imgError;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-2 mb-1.5">
        {isUrl ? (
          <motion.img
            src={message.avatar}
            alt={message.sender}
            onError={() => setImgError(true)}
            className="w-6 h-6 rounded-full object-cover shadow-sm"
            style={{ border: "1.5px solid var(--accent)" }}
            whileHover={{ scale: 1.1 }}
          />
        ) : (
          <motion.div
            className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-sm"
            style={{ background: "var(--accent)", border: "1px solid rgba(255,255,255,0.2)" }}
            whileHover={{ scale: 1.1 }}
          >
            {message.avatar && message.avatar.length <= 3
              ? message.avatar
              : message.sender?.charAt(0) || "?"}
          </motion.div>
        )}
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-white leading-none">
            {message.sender}
          </span>
          <span className="text-[9px] text-white/60 mt-0.5 uppercase tracking-wider font-medium">
            {message.senderRole}
          </span>
        </div>
      </div>

      {/* Message bubble */}
      <div
        className="ml-8 p-3 rounded-2xl rounded-tl-none text-xs leading-relaxed border"
        style={{
          background: "var(--bg-window-raised)",
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
      >
        {message.text}

        {shuffledChoices.length > 0 && (
          <div className="mt-4 space-y-2">
            {shuffledChoices.map((choice) => {
              const isSelected = chosen === choice.id;
              const isOtherSelected = chosen && !isSelected;
              if (isOtherSelected) return null;
              return (
                <motion.button
                  key={choice.id}
                  onClick={() => handleChoice(choice)}
                  disabled={!!chosen}
                  whileHover={!chosen ? { x: 4 } : {}}
                  className={`
                    w-full p-2.5 rounded-xl text-left transition-all relative border
                    ${isSelected
                      ? choice.isCorrect
                        ? "bg-[var(--success-subtle)] border-[var(--success)]/40 text-[var(--success)]"
                        : "bg-[var(--danger-subtle)] border-[var(--danger)]/40 text-[var(--danger)]"
                      : "bg-[var(--bg-window-sunken)] border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">•</span>
                    <span>{choice.label}</span>
                  </div>
                  {isSelected && (
                    <motion.div
                      layoutId={`indicator-${message.id}`}
                      className="absolute inset-y-0 left-0 w-1 bg-current rounded-full shadow-[0_0_8px_currentColor]"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Choice feedback */}
      <AnimatePresence>
        {chosen && (() => {
          const choice = message.choices?.find(c => c.id === chosen);
          if (!choice) return null;
          const delta = choice.scoreEffect?.points ?? 0;
          return (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-8 mt-2 flex items-center gap-2"
            >
              <span
                className="text-[11px] font-medium"
                style={{ color: choice.isCorrect ? "#4ade80" : "#f87171" }}
              >
                {choice.isCorrect ? "✓ Good call." : "✗ Wrong call."}
              </span>
              {delta !== 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm"
                  style={{ background: delta > 0 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)", color: delta > 0 ? "#4ade80" : "#f87171" }}
                >
                  {delta > 0 ? `+${delta}` : delta} trust
                </span>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}
