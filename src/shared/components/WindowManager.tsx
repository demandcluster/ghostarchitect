"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";

// Slack logo used in DM sidebar header
const SlackLogoSmall = () => (
  <svg width="14" height="14" viewBox="0 0 240 240" fill="none">
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
  const teamName = useGameStore((s) => s.teamName);
  const isBreach = visualMode === "breach";

  const handleFocus = useCallback((id: string) => {
    onWindowFocus?.(id);
  }, [onWindowFocus]);

  return (
    <div className="flex flex-1 min-h-0">
      {/* Main window area — tiling layout */}
      <div className="flex-1 flex gap-0 overflow-hidden min-h-0">
        <AnimatePresence mode="popLayout">
          {windows.map((win) => {
            const isActive = activeWindowId === win.id;

            const outerClasses = isBreach
              ? `flex flex-col min-w-0 border-r border-[var(--border)] ${isActive ? "border-t-2 border-t-[var(--accent)]" : ""}`
              : `flex flex-col min-w-0 border-r border-[var(--border)] ${isActive ? "ring-1 ring-[var(--accent-ring)]" : ""}`;

            const titleBarClasses = isBreach
              ? `h-10 flex items-center px-3 shrink-0 bg-[var(--window-header-from)] border-b border-[var(--window-header-border,var(--border)]]`
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
                layout
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1], layout: { duration: 0.3 } }}
                className={`${outerClasses} ${widthClass}`}
                style={{
                  ...(isBreach && isActive ? { boxShadow: "var(--glow-green)" } : undefined),
                  ...(isBreach || !isActive ? {} : { background: "linear-gradient(135deg, var(--window-header-from), var(--window-header-to))" })
                }}
                onClick={() => handleFocus(win.id)}
                whileHover={isActive ? {} : undefined}
              >
                {/* Window title bar */}
                <div className={titleBarClasses} style={!isBreach ? { borderColor: "rgba(255,255,255,0.08)" } : undefined}>
                  {isBreach ? (
                    <motion.span
                      className={`font-mono text-[11px] uppercase tracking-[0.08em] truncate ${isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {`> ${win.title}`}
                    </motion.span>
                  ) : (
                    <>
                      {/* Traffic-light dots */}
                      <div className="flex items-center gap-1.5 mr-3 shrink-0">
                        <motion.div
                          className="w-3 h-3 rounded-full"
                          style={{ background: "#ff5f57" }}
                          whileHover={{ scale: 1.2 }}
                          transition={{ type: "spring", stiffness: 500, damping: 17 }}
                        />
                        <motion.div
                          className="w-3 h-3 rounded-full"
                          style={{ background: "#febc2e" }}
                          whileHover={{ scale: 1.2 }}
                          transition={{ type: "spring", stiffness: 500, damping: 17 }}
                        />
                        <motion.div
                          className="w-3 h-3 rounded-full"
                          style={{ background: "#28c840" }}
                          whileHover={{ scale: 1.2 }}
                          transition={{ type: "spring", stiffness: 500, damping: 17 }}
                        />
                      </div>
                      <motion.span
                        className="text-sm font-semibold text-white truncate"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {win.title}
                      </motion.span>
                    </>
                  )}
                </div>
                {/* Window content */}
                <motion.div
                  className={bodyClasses}
                  style={{ background: "var(--bg-window)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {win.content}
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* DM Sidebar */}
      <AnimatePresence mode="wait">
        {dmSidebar && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: dmCollapsed ? 40 : 280 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className={`
              shrink-0 border-l border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden
            `}
          >
            {dmCollapsed ? (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onToggleDM}
                className="w-full h-12 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                title="Expand messages"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                DM
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col"
              >
                <div
                  className={`h-10 flex items-center justify-between px-3 border-b text-xs font-medium`}
                  style={{
                    borderColor: "var(--border)",
                    ...(isBreach
                      ? { background: "var(--window-header-from)" }
                      : { background: "linear-gradient(135deg, var(--window-header-from), var(--window-header-to))" })
                  }}
                >
                  <motion.span
                    className={isBreach ? "text-[11px] uppercase tracking-[0.08em]" : ""}
                    style={isBreach ? { color: "var(--accent)" } : { color: "white" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {isBreach ? "> Messages" : "Messages"}
                  </motion.span>
                  <motion.button
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    onClick={onToggleDM}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    ×
                  </motion.button>
                </div>
                <motion.div
                  className="flex-1 overflow-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {dmSidebar}
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
