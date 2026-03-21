"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { LogEntry } from "@/content/types";

interface LogTerminalProps {
  entries: LogEntry[];
  onFlaggedChange: (flagged: LogEntry[]) => void;
}

const LEVEL_COLORS: Record<string, string> = {
  INFO: "var(--text-primary)",
  WARN: "var(--warning)",
  ERROR: "var(--danger)",
  CRITICAL: "var(--danger)",
};

export function LogTerminal({ entries, onFlaggedChange }: LogTerminalProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [prevEntries, setPrevEntries] = useState(entries);

  // Reset count if entries change (e.g. new search or new session)
  // This is the recommended pattern for adjusting state when props change
  if (entries !== prevEntries) {
    setPrevEntries(entries);
    setVisibleCount(0);
  }

  const [filterText, setFilterText] = useState("");
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  // Stream logs in over 15-20s
  useEffect(() => {
    if (entries.length === 0) return;

    const totalDuration = 15000; // 15 seconds
    const intervalTime = Math.max(50, totalDuration / entries.length);

    const interval = setInterval(() => {
      setVisibleCount((c) => {
        if (c >= entries.length) {
          clearInterval(interval);
          return entries.length;
        }
        return c + 1;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [entries]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [visibleCount]);

  // Intercept Ctrl+F
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        filterRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const visibleEntries = entries.slice(0, visibleCount);

  const filteredEntries = useMemo(() => {
    if (!filterText) return visibleEntries;
    try {
      const regex = new RegExp(filterText, "i");
      return visibleEntries.filter(
        (e) =>
          regex.test(e.message) ||
          regex.test(e.source) ||
          regex.test(e.level) ||
          regex.test(e.timestamp)
      );
    } catch {
      return visibleEntries.filter(
        (e) =>
          e.message.toLowerCase().includes(filterText.toLowerCase()) ||
          e.source.toLowerCase().includes(filterText.toLowerCase())
      );
    }
  }, [visibleEntries, filterText]);

  const matchCount = filterText ? filteredEntries.length : 0;

  const toggleFlag = useCallback(
    (entry: LogEntry) => {
      setFlaggedIds((prev) => {
        const next = new Set(prev);
        if (next.has(entry.id)) next.delete(entry.id);
        else next.add(entry.id);
        return next;
      });
    },
    []
  );

  useEffect(() => {
    const flagged = entries.filter((e) => flaggedIds.has(e.id));
    onFlaggedChange(flagged);
  }, [flaggedIds, entries, onFlaggedChange]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-window)]">
      {/* Filter bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)] bg-[var(--bg-window-raised)]">
        <span className="text-[var(--accent-cyan,var(--accent))] font-mono text-xs" aria-hidden="true">filter&gt;</span>
        <input
          ref={filterRef}
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Type to filter (regex supported)... Ctrl+F"
          className="flex-1 bg-transparent text-sm font-mono text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] py-1"
          aria-label="Filter log entries"
        />
        {filterText && (
          <span className="bg-[var(--accent-subtle)] text-[var(--accent)] rounded-full px-2.5 py-0.5 text-[11px] font-mono tabular-nums">
            {matchCount} match{matchCount !== 1 ? "es" : ""}
          </span>
        )}
      </div>

      {/* Log lines */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-auto px-2 py-3 font-mono text-[13px] leading-[1.5]"
      >
        {filteredEntries.map((entry) => {
          const lineNum = entries.indexOf(entry) + 1;
          const isFlagged = flaggedIds.has(entry.id);

          return (
            <div
              key={entry.id}
              onClick={() => toggleFlag(entry)}
              className={`
                flex items-start gap-2 px-2.5 py-1 cursor-pointer rounded-sm
                hover:bg-[var(--bg-window-raised)]
                transition-colors duration-150
                ${isFlagged ? "border-l-2 border-[var(--danger)] bg-[var(--danger-subtle)]" : ""}
              `}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleFlag(entry);
                }
              }}
            >
              <span className="text-[var(--text-muted)] select-none w-6 text-right shrink-0 tabular-nums">
                {lineNum}
              </span>
              <span className="text-[var(--text-secondary)] shrink-0 w-[150px]">
                {entry.timestamp}
              </span>
              <span
                className="shrink-0 w-[70px] font-bold"
                style={{ color: LEVEL_COLORS[entry.level] }}
              >
                [{entry.level}]
              </span>
              <span className="text-[var(--accent-blue,var(--info))] shrink-0 w-[120px]">
                {entry.source}
              </span>
              <span style={{ color: LEVEL_COLORS[entry.level] }} className="break-all">
                {entry.message}
              </span>
              {isFlagged && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--danger-subtle)] text-[var(--danger)] ring-1 ring-[var(--danger)]/30 ml-auto shrink-0">
                  FLAGGED
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
