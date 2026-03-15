"use client";

import { useState, useCallback } from "react";
import { Taskbar } from "./Taskbar";
import { WindowManager, WindowConfig } from "./WindowManager";
import { HUD } from "./HUD";
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
}

export function OSShell({ windows, dmSidebar, onAppClick, extraAppIds = ["scoreboard", "wiki"] }: OSShellProps) {
  const [activeWindowId, setActiveWindowId] = useState(windows[0]?.id ?? "");
  const [dmCollapsed, setDmCollapsed] = useState(false);
  const visualMode = useGameStore((s) => s.visualMode);

  const handleAppClick = useCallback(
    (appId: string) => {
      setActiveWindowId(appId);
      onAppClick?.(appId);
    },
    [onAppClick]
  );

  const bgStyle =
    visualMode === "breach"
      ? {
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0,255,65,0.02) 0%, transparent 70%)",
        }
      : {
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(37,99,235,0.03) 0%, transparent 60%)",
        };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-bg-primary">
      {/* Background effect */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={bgStyle}
        aria-hidden="true"
      />

      {visualMode === "breach" && <ScanlineOverlay />}

      <HUD />
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
        activeApp={activeWindowId}
        availableWindowIds={[...windows.map((w) => w.id), ...extraAppIds]}
      />
    </div>
  );
}
