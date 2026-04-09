"use client";

import { useState, useCallback, useEffect } from "react";
import { Taskbar } from "./Taskbar";
import { WindowManager, WindowConfig } from "./WindowManager";
import { TransitionOverlay } from "./TransitionOverlay";
import { useGameStore } from "@/stores/gameStore";

function ScanlineOverlay() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[5] scanlines terminal-flicker"
      aria-hidden="true"
    />
  );
}

interface OSShellProps {
  windows: WindowConfig[];
  dmSidebar?: React.ReactNode;
  onAppClick?: (appId: string) => void;
  /** Extra always-available app IDs (e.g. scoreboard, wiki) shown in taskbar */
  extraAppIds?: string[];
  /** Which overlay panels are currently open — used to drive taskbar active state */
  panelOpen?: Record<string, boolean>;
  onExit?: () => void;
}

export function OSShell({ windows, dmSidebar, onAppClick, extraAppIds = ["scoreboard", "wiki"], panelOpen = {}, onExit }: OSShellProps) {
  const [activeWindowId, setActiveWindowId] = useState(windows[0]?.id ?? "");
  const [dmCollapsed, setDmCollapsed] = useState(false);
  const visualMode = useGameStore((s) => s.visualMode);

  // Reset active window when the currently active window is removed (e.g. wiki closed)
  useEffect(() => {
    if (activeWindowId && !windows.some(w => w.id === activeWindowId)) {
      setActiveWindowId(windows[0]?.id ?? "");
    }
  }, [windows, activeWindowId]);

  const handleAppClick = useCallback(
    (appId: string) => {
      if (appId === "messages") {
        setDmCollapsed((v) => !v);
        return;
      }
      // Only track focus for pure window apps — panel toggles (wiki, scoreboard)
      // have their active state driven by panelOpen, so skip them here
      if (windows.some(w => w.id === appId) && !(appId in panelOpen)) {
        setActiveWindowId(appId);
      }
      onAppClick?.(appId);
    },
    [onAppClick, windows]
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-bg-primary">
      {/* Desktop background */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        {visualMode === "breach" ? (
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at 50% 50%, rgba(0,255,65,0.02) 0%, transparent 70%)",
          }} />
        ) : (
          <>
            {/* Gradient wash */}
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at 25% 60%, rgba(59,110,248,0.07) 0%, transparent 55%), radial-gradient(ellipse at 75% 20%, rgba(99,60,200,0.05) 0%, transparent 50%)",
            }} />
            {/* Subtle dot grid */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }} />
          </>
        )}
      </div>

      {visualMode === "breach" && <ScanlineOverlay />}

      <TransitionOverlay />

      {/* Main area above taskbar */}
      <div className="flex-1 min-h-0 overflow-hidden pb-12 relative z-[1] flex flex-col">
        <WindowManager
          windows={windows}
          dmSidebar={dmSidebar}
          dmCollapsed={dmCollapsed}
          onToggleDM={() => setDmCollapsed((v) => !v)}
          activeWindowId={activeWindowId}
          onWindowFocus={setActiveWindowId}
        />
      </div>

      {/* Taskbar at bottom */}
      <Taskbar
        onAppClick={handleAppClick}
        onExit={onExit}
        activeApp={
          (!dmCollapsed && dmSidebar) ? "messages"
          : Object.entries(panelOpen).find(([, open]) => open)?.[0]
          ?? activeWindowId
        }
        availableWindowIds={[
          ...windows.map((w) => w.id),
          ...extraAppIds,
          ...(dmSidebar ? ["messages"] : []),
        ]}
      />
    </div>
  );
}
