"use client";

import { useEffect } from "react";
import { useGameStore } from "@/stores/gameStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const visualMode = useGameStore((s) => s.visualMode);

  useEffect(() => {
    const theme = visualMode === "breach" ? "breach" : "corporate";
    document.documentElement.setAttribute("data-theme", theme);
  }, [visualMode]);

  return <>{children}</>;
}
