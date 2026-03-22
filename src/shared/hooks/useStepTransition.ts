import { useState, useCallback } from "react";

type GameStep =
  | "start"
  | "login"
  | "mfa"
  | "onboarding-portal"
  | "breach-email"
  | "breach-password"
  | "breach-wifi"
  | "investigation-containment"
  | "investigation-logs"
  | "investigation-lolbins"
  | "investigation-ioc"
  | "investigation-rotation"
  | "debrief"
  | "ending";

export function useStepTransition(setStep: (step: GameStep) => void) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const changeStep = useCallback(async (newStep: GameStep) => {
    // Prevent concurrent transitions
    if (isTransitioning) return;

    setIsTransitioning(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // fade out
    setStep(newStep);
    await new Promise(resolve => setTimeout(resolve, 300)); // fade in
    setIsTransitioning(false);
  }, [isTransitioning, setStep]);

  return { isTransitioning, changeStep };
}
