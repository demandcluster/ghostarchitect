import { useState, useCallback } from "react";
import { useGameStore } from "@/stores/gameStore";
import type { GameStep } from "@/app/page";

export function useStepTransition() {
  const setPhase = useGameStore((s) => s.setPhase);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const changeStep = useCallback(async (newStep: GameStep) => {
    // Prevent concurrent transitions
    if (isTransitioning) return;

    setIsTransitioning(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // fade out
    setPhase(newStep);
    await new Promise(resolve => setTimeout(resolve, 300)); // fade in
    setIsTransitioning(false);
  }, [isTransitioning, setPhase]);

  return { isTransitioning, changeStep };
}
