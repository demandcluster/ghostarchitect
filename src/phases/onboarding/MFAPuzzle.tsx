"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useGameStore } from "@/stores/gameStore";

interface MFAPuzzleProps {
  onComplete: () => void;
}

function ShieldIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function MFAPuzzle({ onComplete }: MFAPuzzleProps) {
  const [selected, setSelected] = useState<"authenticator" | "sms" | null>(null);
  const [showResult, setShowResult] = useState(false);
  const addAction = useScoreStore((s) => s.addAction);
  const adjustTrust = useScoreStore((s) => s.adjustTrust);
  const setDecision = useNarrativeStore((s) => s.setDecision);
  const teamName = useGameStore((s) => s.teamName);
  const addFlag = useNarrativeStore((s) => s.addFlag);

  const handleChoice = (choice: "authenticator" | "sms") => {
    setSelected(choice);
    setDecision("mfa_choice", choice);

    if (choice === "authenticator") {
      addAction({
        id: "mfa-auth",
        category: "passwordHygiene",
        points: 25,
        maxPoints: 25,
        label: "Chose authenticator app for MFA",
      });
      adjustTrust(15);
      addFlag("chose_strong_mfa");
    } else {
      addAction({
        id: "mfa-sms",
        category: "passwordHygiene",
        points: 10,
        maxPoints: 25,
        label: "Chose SMS for MFA (vulnerable to SIM swap)",
      });
      adjustTrust(5);
    }

    setShowResult(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-secondary">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-bg-primary rounded-lg shadow-lg p-8 border border-border"
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-3">
            <ShieldIcon />
          </div>
          <h2 className="text-lg font-bold text-text-primary">
            Set Up Multi-Factor Authentication
          </h2>
          <p className="text-sm text-text-secondary mt-2">
            {teamName} requires MFA on all accounts. Choose your second factor:
          </p>
        </div>

        {!showResult ? (
          <div className="space-y-3">
            <button
              onClick={() => handleChoice("authenticator")}
              className="w-full p-4 border border-border rounded-lg text-left hover:border-accent transition-colors flex items-start gap-3 group"
            >
              <span className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-accent flex-shrink-0 flex items-center justify-center transition-colors">
                <span className="w-2 h-2 rounded-full bg-transparent group-hover:bg-accent transition-colors" />
              </span>
              <div className="flex-1">
                <div className="font-medium text-text-primary text-sm flex items-center gap-2">
                  Authenticator App (TOTP)
                  <span className="text-[10px] font-medium bg-[var(--success-subtle)] text-[var(--success)] px-1.5 py-0.5 rounded">
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Time-based codes from Google Authenticator, Authy, or similar.
                  Codes rotate every 30 seconds.
                </p>
              </div>
            </button>

            <button
              onClick={() => handleChoice("sms")}
              className="w-full p-4 border border-border rounded-lg text-left hover:border-accent transition-colors flex items-start gap-3 group"
            >
              <span className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-accent flex-shrink-0 flex items-center justify-center transition-colors">
                <span className="w-2 h-2 rounded-full bg-transparent group-hover:bg-accent transition-colors" />
              </span>
              <div className="flex-1">
                <div className="font-medium text-text-primary text-sm flex items-center gap-2">
                  SMS Text Message
                  <span className="text-[10px] font-medium bg-[var(--warning-subtle)] text-[var(--warning)] px-1.5 py-0.5 rounded">
                    LESS SECURE
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Receive a 6-digit code via text message to your phone number.
                </p>
              </div>
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-4"
          >
            <div
              className={`p-4 rounded-lg border ${
                selected === "authenticator"
                  ? "bg-[var(--success-subtle)] border-[var(--success)]/35"
                  : "bg-[var(--warning-subtle)] border-[var(--warning)]/35"
              }`}
            >
              {selected === "authenticator" ? (
                <>
                  <p className="text-sm font-medium text-[var(--success)]">
                    Excellent choice!
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Authenticator apps generate codes locally on your device.
                    They are resistant to SIM swap attacks, SS7 network
                    exploits, and phone number porting fraud.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-[var(--warning)]">
                    SMS works, but has known vulnerabilities.
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    SMS codes can be intercepted via SIM swap attacks, SS7
                    network exploits, or phone number porting. NIST deprecated
                    SMS as a second factor. An authenticator app is the
                    recommended choice.
                  </p>
                </>
              )}
            </div>

            <button
              onClick={onComplete}
              className="w-full py-2 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Continue to Portal
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
