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
    ? revealedIds.map(id => messages.find(m => m.id === id)).filter((m): m is DMMessage => !!m)
    : messages.slice(0, revealUpTo);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [revealUpTo, revealedIds]);

  return (
    <div className="flex flex-col h-full" style={{ background: "#f8fafc" }}>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        <AnimatePresence>
          {visibleMessages.map((msg, idx) => (
            <motion.div
              key={msg.id || `msg-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
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
  onChoice,
}: {
  message: DMMessage;
  onChoice: (messageId: string, choice: DMChoice) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);

  const handleChoice = (choice: DMChoice) => {
    if (chosen) return;
    setChosen(choice.id);
    onChoice(message.id, choice);
  };

  return (
    <div>
      {/* Avatar + name */}
      <div className="flex items-center gap-2 mb-1">
        {message.avatar && (message.avatar.startsWith('http://') || message.avatar.startsWith('https://') || message.avatar.startsWith('/')) ? (
          <img
            src={message.avatar}
            alt={message.sender}
            className="w-6 h-6 rounded-full object-cover"
            style={{ border: '2px solid rgba(59,110,248,0.2)' }}
          />
        ) : (
          <div className="w-6 h-6 rounded-full text-accent text-[10px] font-bold flex items-center justify-center" style={{ background: "rgba(59,110,248,0.08)" }}>
            {message.avatar || message.sender?.charAt(0) || '?'}
          </div>
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
      <div className="ml-8 p-2 rounded-lg text-xs leading-relaxed" style={{ background: "#f8fafc", color: "#1e293b" }}>
        {message.text}
      </div>

      {/* Choices */}
      {message.choices && (
        <div className="ml-8 mt-2 space-y-1">
          {message.choices.map((choice, idx) => (
            <button
              key={choice.id || `choice-${idx}`}
              onClick={() => handleChoice(choice)}
              disabled={chosen !== null}
              className="w-full text-left px-3 py-2 rounded text-xs transition-colors border"
              style={{
                borderColor: chosen === choice.id
                  ? choice.isCorrect
                    ? "rgba(22,163,74,0.4)"
                    : "rgba(220,38,38,0.4)"
                  : chosen
                    ? "var(--border)"
                    : "var(--border)",
                background: chosen === choice.id
                  ? choice.isCorrect
                    ? "rgba(22,163,74,0.08)"
                    : "rgba(220,38,38,0.08)"
                  : "rgba(59,110,248,0.06)",
                opacity: chosen === null || chosen === choice.id ? 1 : 0.4
              }}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}

      {/* Post-choice feedback */}
      {chosen && (() => {
        const picked = message.choices!.find((c) => c.id === chosen)!;
        const delta = picked.isCorrect ? 10 : -10;
        return (
          <div className="mt-1 px-3 py-1.5 rounded text-[11px] flex items-center gap-2" style={{
            background: picked.isCorrect
              ? "rgba(22,163,74,0.08)"
              : "rgba(220,38,38,0.08)",
            color: picked.isCorrect ? "#22c55e" : "#ef4444"
          }}>
            <span>{picked.isCorrect ? "✓ Good call." : "✗ Wrong call."}</span>
            <span style={{ color: delta > 0 ? "#22c55e" : "#ef4444" }}>
              {delta > 0 ? `+${delta}` : delta} trust
            </span>
          </div>
        );
      })()}
    </div>
  );
}
