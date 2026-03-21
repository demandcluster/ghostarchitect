"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DMMessage, DMChoice } from "@/content/types";

interface DMSidebarProps {
  messages: DMMessage[];
  onChoice: (messageId: string, choice: DMChoice) => void;
  revealUpTo?: number;
  revealedIds?: string[];
}

export function DMSidebar({
  messages,
  onChoice,
  revealUpTo = 999,
  revealedIds = [],
}: DMSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, revealedIds]);

  const visibleMessages = messages.filter(
    (m, i) => i < revealUpTo || revealedIds.includes(m.id)
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
      >
        <AnimatePresence mode="popLayout">
          {visibleMessages.map((msg) => (
            <DMBubble key={msg.id} message={msg} onChoice={onChoice} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DMBubble({
  message,
  onChoice
}: {
  message: DMMessage;
  onChoice: (messageId: string, choice: DMChoice) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [hoveredChoice, setHoveredChoice] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  // Shuffle choices once per message to prevent predictable answer order
  const shuffledChoices = useMemo(() => {
    if (!message.choices) return [];
    return [...message.choices].sort(() => Math.random() - 0.5);
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

        {/* Choices */}
        {shuffledChoices.length > 0 && (
          <div className="mt-4 space-y-2">
            {shuffledChoices.map((choice) => {
              const isSelected = chosen === choice.id;
              const isOtherSelected = chosen && !isSelected;
              const isCorrect = choice.isCorrect;

              return (
                <motion.button
                  key={choice.id}
                  onClick={() => handleChoice(choice)}
                  disabled={!!chosen}
                  onMouseEnter={() => !chosen && setHoveredChoice(choice.id)}
                  onMouseLeave={() => setHoveredChoice(null)}
                  whileHover={!chosen ? { x: 4 } : {}}
                  className={`
                    w-full p-2.5 rounded-xl text-left transition-all relative border
                    ${
                      isSelected
                        ? isCorrect
                          ? "bg-[var(--success-subtle)] border-[var(--success)]/40 text-[var(--success)]"
                          : "bg-[var(--danger-subtle)] border-[var(--danger)]/40 text-[var(--danger)]"
                        : isOtherSelected
                          ? "opacity-40 border-transparent bg-transparent"
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
          if (!choice?.scoreEffect) return null;
          const delta = choice.scoreEffect.points;
          return (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-8 mt-2 flex items-center gap-2"
            >
              <motion.span 
                className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm"
                style={{ background: delta > 0 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)", color: delta > 0 ? "#4ade80" : "#f87171" }}
              >
                {delta > 0 ? `+${delta}` : delta} trust
              </motion.span>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}
