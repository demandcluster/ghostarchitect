"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";

export interface WindowConfig {
  id: string;
  title: string;
  content: React.ReactNode;
  defaultWidth?: string;
}

interface WindowManagerProps {
  windows: WindowConfig[];
  dmSidebar?: React.ReactNode;
  dmCollapsed?: boolean;
  onToggleDM?: () => void;
  activeWindowId?: string;
  onWindowFocus?: (id: string) => void;
}

export function WindowManager({
  windows,
  dmSidebar,
  dmCollapsed = false,
  onToggleDM,
  activeWindowId: controlledActiveWindowId,
  onWindowFocus,
}: WindowManagerProps) {
  const activeWindowId = controlledActiveWindowId ?? windows[0]?.id ?? "";
  const visualMode = useGameStore((s) => s.visualMode);
  const isBreach = visualMode === "breach";

  const handleFocus = useCallback((id: string) => {
    onWindowFocus?.(id);
  }, [onWindowFocus]);

  return (
    <div className="flex flex-1 min-h-0">
      {/* Main window area — tiling layout */}
      <div className="flex-1 flex gap-0 overflow-hidden min-h-0">
        {windows.map((win) => {
          const isActive = activeWindowId === win.id;

          const outerClasses = isBreach
            ? `flex flex-col min-w-0 border-r border-[var(--border)] ${isActive ? "border-t-2 border-t-[var(--accent)]" : ""}`
            : `flex flex-col min-w-0 border-r border-[var(--border)] ${isActive ? "ring-1 ring-[var(--accent-ring)]" : ""}`;

          const titleBarClasses = isBreach
            ? `h-10 flex items-center px-3 shrink-0 bg-[var(--window-header-from)] border-b border-[var(--window-header-border,var(--border))]`
            : `h-10 flex items-center px-3 shrink-0 border-b ${!isActive ? "opacity-85" : ""}`;

          const bodyClasses = isBreach
            ? "flex-1 min-h-0 overflow-hidden flex flex-col"
            : "flex-1 min-h-0 overflow-hidden flex flex-col";

          const widthClass =
            windows.length === 1
              ? "w-full"
              : windows.length === 2 && windows[0].id === win.id
                ? "w-[65%]"
                : windows.length === 2 && windows[1].id === win.id
                  ? "w-[35%]"
                  : "flex-1";

          return (
            <motion.div
              key={win.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={`${outerClasses} ${widthClass}`}
              style={{
                ...(isBreach && isActive ? { boxShadow: "var(--glow-green)" } : undefined),
                ...(isBreach || !isActive ? {} : { background: "linear-gradient(135deg, var(--window-header-from), var(--window-header-to))" })
              }}
              onClick={() => handleFocus(win.id)}
            >
              {/* Window title bar */}
              <div className={titleBarClasses} style={!isBreach ? { borderColor: "rgba(255,255,255,0.08)" } : undefined}>
                {isBreach ? (
                  <span className={`font-mono text-[11px] uppercase tracking-[0.08em] truncate ${isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
                    {`> ${win.title}`}
                  </span>
                ) : (
                  <>
                    {/* Traffic-light dots */}
                    <div className="flex items-center gap-1.5 mr-3 shrink-0">
                      <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
                      <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
                      <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
                    </div>
                    <span className="text-sm font-semibold text-white truncate">
                      {win.title}
                    </span>
                  </>
                )}
              </div>
              {/* Window content */}
              <div className={bodyClasses} style={{ background: "var(--bg-window)" }}>
                {win.content}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* DM Sidebar */}
      {dmSidebar && (
        <div
          className={`
            shrink-0 border-l border-[var(--border)] bg-[var(--bg-secondary)] transition-all duration-200
            ${dmCollapsed ? "w-10" : "w-[280px]"}
          `}
        >
          {dmCollapsed ? (
            <button
              onClick={onToggleDM}
              className="w-full h-12 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              title="Expand messages"
            >
              DM
            </button>
          ) : (
            <div className="h-full flex flex-col">
              <div
                className={`h-10 flex items-center justify-between px-3 border-b text-xs font-medium`}
                style={{
                  borderColor: "var(--border)",
                  ...(isBreach
                    ? { background: "var(--window-header-from)" }
                    : { background: "linear-gradient(135deg, var(--window-header-from), var(--window-header-to))" })
                }}
              >
                <span className={isBreach ? "text-[11px] uppercase tracking-[0.08em]" : ""} style={isBreach ? { color: "var(--accent)" } : { color: "white" }}>
                  {isBreach ? "> Messages" : "Messages"}
                </span>
                <button
                  onClick={onToggleDM}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-auto">{dmSidebar}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
