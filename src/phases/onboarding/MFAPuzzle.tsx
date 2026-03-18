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
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12 overflow-hidden bg-[var(--bg-primary)]">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,229,51,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,51,0.05) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-3xl border border-[rgba(0,229,51,0.15)] bg-[rgba(0,1,12,0.7)] backdrop-blur-2xl p-8 shadow-[0_0_60px_rgba(0,0,0,0.6)]"
        >
          <div className="text-center mb-10">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 bg-[rgba(0,229,51,0.05)] border border-[rgba(0,229,51,0.15)] shadow-[0_0_20px_rgba(0,229,51,0.1)]">
              <ShieldIcon />
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-[rgba(0,229,51,0.1)] border border-[rgba(0,229,51,0.2)] text-[10px] text-[var(--accent)] tracking-[0.3em] font-bold mb-3 uppercase">
              Security Protocol
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white uppercase">
              Set Up Multi-Factor
            </h2>
            <p className="text-[11px] mt-2 font-mono text-white/40 tracking-wider">
              {teamName.toUpperCase()} REQUIRES SECOND FACTOR AUTH
            </p>
          </div>

          {!showResult ? (
            <div className="space-y-4">
              <button
                onClick={() => handleChoice("authenticator")}
                className="w-full p-5 border rounded-2xl text-left transition-all flex items-start gap-4 group relative overflow-hidden"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(0,229,51,0.15)" }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[rgba(0,229,51,0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all group-hover:border-[var(--accent)]" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="relative z-10">
                  <div className="font-bold text-sm text-white flex items-center gap-3">
                    Authenticator App
                    <span className="text-[9px] font-bold bg-[rgba(0,229,51,0.1)] text-[var(--accent)] px-2 py-0.5 rounded-full border border-[rgba(0,229,51,0.2)] tracking-tighter">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-[11px] mt-1 text-white/50 leading-relaxed">
                    Time-based OTP codes. High resistance to SS7 exploits and SIM-swaps.
                  </p>
                </div>
              </button>

              <button
                onClick={() => handleChoice("sms")}
                className="w-full p-5 border rounded-2xl text-left transition-all flex items-start gap-4 group relative overflow-hidden"
                style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,184,0,0.15)" }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[rgba(255,184,0,0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all group-hover:border-[var(--warning)]" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--warning)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="relative z-10">
                  <div className="font-bold text-sm text-white flex items-center gap-3">
                    SMS Text Message
                    <span className="text-[9px] font-bold bg-[rgba(255,184,0,0.1)] text-[var(--warning)] px-2 py-0.5 rounded-full border border-[rgba(255,184,0,0.2)] tracking-tighter uppercase">
                      Legacy
                    </span>
                  </div>
                  <p className="text-[11px] mt-1 text-white/50 leading-relaxed">
                    Receive codes via mobile network. Vulnerable to interception.
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div
                className="p-5 rounded-2xl border"
                style={{ 
                  background: selected === "authenticator" ? "rgba(0,229,51,0.05)" : "rgba(255,45,85,0.05)",
                  borderColor: selected === "authenticator" ? "rgba(0,229,51,0.2)" : "rgba(255,45,85,0.2)"
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-2 h-2 rounded-full ${selected === "authenticator" ? "bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" : "bg-[var(--danger)] shadow-[0_0_8px_var(--danger)]"}`} />
                  <p className="text-xs font-bold uppercase tracking-widest text-white">
                    {selected === "authenticator" ? "Optimal Security Configured" : "Sub-optimal Configured"}
                  </p>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed font-mono">
                  {selected === "authenticator" 
                    ? "TOTP-based auth provides local cryptographic verification. This mitigates most SS7-level interception attacks."
                    : "SMS-based auth is deprecated by NIST due to SIM-swapping risks. You have been granted temporary access with reduced trust."}
                </p>
              </div>

              <button
                onClick={onComplete}
                className="w-full bg-[var(--accent)] text-black font-bold py-4 rounded-xl text-xs tracking-[0.2em] hover:brightness-110 active:scale-[0.98] transition-all hover:shadow-[0_0_25px_rgba(0,229,51,0.4)] uppercase"
              >
                Access Portal
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
