"use client";

import { useState, useEffect, useRef } from "react";
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
  revealUpTo = 0,
  revealedIds
}: DMSidebarProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // If revealedIds is provided, we use those IDs to show messages in discovery order.
  // This ensures replies appear correctly threaded underneath their triggers.
  const visibleMessages = revealedIds
    ? revealedIds
        .map((id) => messages.find((m) => m.id === id))
        .filter((m): m is DMMessage => !!m)
    : messages.slice(0, revealUpTo);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [revealUpTo, revealedIds]);

  return (
    <div className="flex flex-col h-full" style={{ background: "#f8fafc" }}>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        <AnimatePresence mode="popLayout">
          {visibleMessages.map((msg, idx) => (
            <motion.div
              key={msg.id ?? `msg-${idx}`}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                height: 0,
                marginBottom: 0,
                overflow: "hidden"
              }}
              transition={{
                duration: 0.3,
                layout: { duration: 0.3 }
              }}
              layout
            >
              <DMBubble message={msg} onChoice={onChoice} />
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
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

  const handleChoice = (choice: DMChoice) => {
    if (chosen) return;
    setChosen(choice.id);
    onChoice(message.id, choice);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-2 mb-1">
        {message.avatar &&
        (message.avatar.startsWith("http://") ||
          message.avatar.startsWith("https://") ||
          message.avatar.startsWith("/")) ? (
          <motion.img
            src={message.avatar}
            alt={message.sender}
            className="w-6 h-6 rounded-full object-cover"
            style={{ border: "2px solid rgba(59,110,248,0.2)" }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          />
        ) : (
          <motion.div
            className="w-6 h-6 rounded-full text-accent text-[10px] font-bold flex items-center justify-center"
            style={{ background: "rgba(59,110,248,0.08)" }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            {message.avatar || message.sender?.charAt(0) || "?"}
          </motion.div>
        )}
      </div>

      {/* Name and role */}
      <div>
        <span className="text-xs font-medium" style={{ color: "#475569" }}>
          {message.sender}
        </span>
        <span className="text-[10px] ml-1" style={{ color: "#94a3b8" }}>
          {message.senderRole}
        </span>
      </div>

      {/* Message text */}
      <motion.div
        className="ml-8 p-3 rounded-lg text-sm leading-relaxed max-w-[65ch]"
        style={{ background: "#f8fafc", color: "#1e293b" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {message.text}
      </motion.div>

      {/* Choices */}
      {message.choices && (
        <div className="ml-8 mt-3 space-y-2">
          {message.choices.map((choice, idx) => {
            const isSelected = chosen === choice.id;
            const isHovered = hoveredChoice === choice.id;
            const isCorrect = choice.isCorrect;

            return (
              <motion.button
                key={choice.id || `choice-${idx}`}
                onClick={() => handleChoice(choice)}
                disabled={chosen !== null}
                onHoverStart={() => setHoveredChoice(choice.id)}
                onHoverEnd={() => setHoveredChoice(null)}
                className="w-full text-left px-3.5 py-2.5 rounded-sm text-sm font-medium transition-all border relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-[rgba(59,110,248,0.4)]"
                whileHover={chosen === null ? { x: 4 } : undefined}
                whileTap={chosen === null ? { scale: 0.98 } : undefined}
                style={{
                  borderColor: isSelected
                    ? isCorrect
                      ? "rgba(22,163,74,0.4)"
                      : "rgba(220,38,38,0.4)"
                    : chosen
                      ? "var(--border)"
                      : isHovered && chosen === null
                        ? "rgba(59,110,248,0.3)"
                        : "var(--border)",
                  background: isSelected
                    ? isCorrect
                      ? "rgba(22,163,74,0.08)"
                      : "rgba(220,38,38,0.08)"
                    : "rgba(59,110,248,0.06)",
                  opacity: chosen === null || isSelected ? 1 : 0.4,
                  boxShadow:
                    isHovered && chosen === null
                      ? "0 2px 8px rgba(59,110,248,0.15)"
                      : "none"
                }}
              >
                <motion.div
                  className="absolute inset-0"
                  initial={false}
                  animate={{
                    background:
                      isHovered && chosen === null
                        ? "rgba(59,110,248,0.03)"
                        : "rbga(0,0,0,0.0)"
                  }}
                  transition={{ duration: 0.2 }}
                />
                <span className="relative z-10">{choice.label}</span>
                {/* Hover indicator for correct answer (subtle hint) */}
                {isHovered && !chosen && isCorrect && (
                  <motion.span
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] opacity-30"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.3, scale: 1 }}
                  >
                    ✓
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Post-choice feedback */}
      <AnimatePresence>
        {chosen &&
          (() => {
            const picked = message.choices!.find((c) => c.id === chosen)!;
            const delta = picked.isCorrect ? 10 : -10;
            return (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 px-3.5 py-2 rounded-sm text-sm flex items-center gap-2"
                style={{
                  background: picked.isCorrect
                    ? "rgba(22,163,74,0.08)"
                    : "rgba(220,38,38,0.08)",
                  color: picked.isCorrect ? "#22c55e" : "#ef4444"
                }}
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {picked.isCorrect ? "✓ Good call." : "✗ Wrong call."}
                </motion.span>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 17,
                    delay: 0.1
                  }}
                  style={{ color: delta > 0 ? "#22c55e" : "#ef4444" }}
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
