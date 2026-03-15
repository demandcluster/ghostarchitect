"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DMMessage, DMChoice } from "@/content/types";

interface DMSidebarProps {
  messages: DMMessage[];
  onChoice: (messageId: string, choice: DMChoice) => void;
  revealUpTo: number;
}

export function DMSidebar({ messages, onChoice, revealUpTo }: DMSidebarProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const visibleMessages = messages.slice(0, revealUpTo);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [revealUpTo]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-3 space-y-3">
        <AnimatePresence>
          {visibleMessages.map((msg) => (
            <motion.div
              key={msg.id}
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
        <div className="w-6 h-6 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center">
          {message.avatar}
        </div>
        <div>
          <span className="text-xs font-medium text-text-primary">
            {message.sender}
          </span>
          <span className="text-[10px] text-text-muted ml-1">
            {message.senderRole}
          </span>
        </div>
      </div>

      {/* Message text */}
      <div className="ml-8 p-2 bg-bg-tertiary rounded-lg text-xs text-text-primary leading-relaxed">
        {message.text}
      </div>

      {/* Choices */}
      {message.choices && (
        <div className="ml-8 mt-2 space-y-1">
          {message.choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => handleChoice(choice)}
              disabled={chosen !== null}
              className={`
                w-full text-left px-3 py-2 rounded text-xs transition-colors border
                ${
                  chosen === choice.id
                    ? choice.isCorrect
                      ? "border-[rgba(22,163,74,0.4)] bg-[rgba(22,163,74,0.08)]"
                      : "border-[rgba(220,38,38,0.4)] bg-[rgba(220,38,38,0.08)]"
                    : chosen
                      ? "border-border opacity-50"
                      : "border-border hover:border-accent"
                }
              `}
            >
              {choice.label}
            </button>
          ))}

          {/* Post-choice feedback */}
          {chosen && (() => {
            const picked = message.choices!.find((c) => c.id === chosen)!;
            const delta = picked.trustDelta ?? 0;
            return (
              <div className={`mt-1 px-3 py-1.5 rounded text-[11px] flex items-center gap-2 ${
                picked.isCorrect
                  ? "bg-[rgba(22,163,74,0.08)] text-[#22c55e]"
                  : "bg-[rgba(220,38,38,0.08)] text-[#ef4444]"
              }`}>
                <span>{picked.isCorrect ? "✓ Good call." : "✗ Wrong call."}</span>
                {delta !== 0 && (
                  <span className={delta > 0 ? "text-[#22c55e]" : "text-[#ef4444]"}>
                    {delta > 0 ? `+${delta}` : delta} trust
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
