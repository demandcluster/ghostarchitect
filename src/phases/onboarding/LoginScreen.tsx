"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";

interface LoginScreenProps {
  onLogin: () => void;
}

type StrengthLevel = "empty" | "weak" | "fair" | "strong";

function getStrength(password: string): StrengthLevel {
  if (!password) return "empty";
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const complexity = [hasUpper, hasLower, hasDigit, hasSymbol].filter(Boolean).length;
  if (len < 8 || complexity < 2) return "weak";
  if (len < 12 || complexity < 3) return "fair";
  return "strong";
}

const STRENGTH_META: Record<StrengthLevel, { label: string; barClass: string; bars: number }> = {
  empty:  { label: "",        barClass: "bg-[var(--border-strong)]", bars: 0 },
  weak:   { label: "Weak",   barClass: "bg-[var(--danger)]",         bars: 1 },
  fair:   { label: "Fair",   barClass: "bg-[var(--warning)]",        bars: 2 },
  strong: { label: "Strong", barClass: "bg-[var(--success)]",        bars: 3 },
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const teamName = useGameStore((s) => s.teamName);
  const fakeDomain = useGameStore((s) => s.fakeDomain);
  const logoUrl = useGameStore((s) => s.logoUrl);
  const addAction = useScoreStore((s) => s.addAction);
  const adjustTrust = useScoreStore((s) => s.adjustTrust);
  const addFlag = useNarrativeStore((s) => s.addFlag);
  const setPlayerHandle = useGameStore((s) => s.setPlayerHandle);

  const initials = teamName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const strength = getStrength(password);
  const meta = STRENGTH_META[strength];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter your credentials");
      return;
    }

    const parsedHandle = username.includes("@") ? username.split("@")[0] : username;
    setPlayerHandle(parsedHandle);

    const pointsMap: Record<StrengthLevel, number> = { empty: 0, weak: 0, fair: 3, strong: 5 };
    const points = pointsMap[strength];
    addAction({
      id: "login-password-strength",
      category: "passwordHygiene",
      points,
      maxPoints: 5,
      label: `Login password strength: ${strength}`,
    });

    if (strength === "weak") {
      adjustTrust(-10);
      addFlag("weak_login_password");
    } else if (strength === "fair") {
      adjustTrust(-3);
    }

    onLogin();
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 py-12 overflow-hidden bg-[var(--bg-primary)]">
      {/* Background elements to match Landing Page */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,229,51,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,51,0.05) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-sm flex flex-col gap-6">
        {/* Simulation disclaimer - redesigned */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full px-5 py-3 rounded-2xl border border-[rgba(255,184,0,0.3)] bg-[rgba(255,184,0,0.05)] backdrop-blur-md flex gap-4"
        >
          <span className="text-xl shrink-0" style={{ color: "var(--warning)" }}>⚠</span>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-[10px] tracking-[0.2em] uppercase" style={{ color: "var(--warning)" }}>
              Training Simulation
            </span>
            <p className="text-[11px] leading-snug text-white/60">
              Do <span className="text-[var(--warning)] font-bold italic underline">not</span> enter real credentials. 
              Use a fictitious identity.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full rounded-3xl overflow-hidden border border-[rgba(0,229,51,0.15)] bg-[rgba(0,1,12,0.7)] backdrop-blur-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)]"
        >
          {/* Top banner */}
          <div
            className="h-24 flex flex-col items-center justify-center border-b border-white/5"
            style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.02), transparent)" }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={teamName} className="w-10 h-10 rounded-lg object-contain bg-white/5 p-1.5" />
            ) : (
              <div className="w-10 h-10 bg-[rgba(0,229,51,0.1)] border border-[rgba(0,229,51,0.2)] rounded-xl flex items-center justify-center text-xs font-bold text-[var(--accent)] font-mono">
                {initials}
              </div>
            )}
            <p className="text-[10px] font-bold mt-2 uppercase tracking-[0.3em] text-white/40">
              {teamName} Identity
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold tracking-widest uppercase text-[var(--accent)] px-1">
                  Operator Login
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  className="w-full bg-[rgba(0,229,51,0.03)] border border-[rgba(0,229,51,0.2)] rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--accent)] transition-all font-mono placeholder:text-white/30 text-sm"
                  placeholder="user@internal"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-[var(--accent)]">
                    Access Key
                  </label>
                  {strength !== "empty" && (
                    <span className="text-[9px] font-bold uppercase tracking-tighter" style={{ color: meta.barClass.replace('bg-', '') === '[var(--danger)]' ? 'var(--danger)' : meta.barClass.replace('bg-', '') === '[var(--warning)]' ? 'var(--warning)' : 'var(--success)' }}>
                      {meta.label}
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="w-full bg-[rgba(0,229,51,0.03)] border border-[rgba(0,229,51,0.2)] rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--accent)] transition-all font-mono placeholder:text-white/30 text-sm"
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                />
                
                {/* Strength bar */}
                {strength !== "empty" && (
                  <div className="flex gap-1 px-1 mt-2">
                    {[1, 2, 3].map((bar) => (
                      <div
                        key={bar}
                        className="h-1 flex-1 rounded-full transition-all duration-500"
                        style={{
                          background: bar <= meta.bars ? meta.barClass.replace('bg-', '') : "rgba(255,255,255,0.05)",
                          boxShadow: bar <= meta.bars ? `0 0 10px ${meta.barClass.replace('bg-', '')}` : 'none'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-[rgba(255,45,85,0.1)] border border-[rgba(255,45,85,0.3)] rounded-lg p-3 text-[10px] text-[var(--danger)] text-center font-mono">
                  {error.toUpperCase()}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[var(--accent)] text-black font-bold py-4 rounded-xl text-xs tracking-[0.2em] hover:brightness-110 active:scale-[0.98] transition-all hover:shadow-[0_0_25px_rgba(0,229,51,0.4)] uppercase mt-2"
              >
                Authorize
              </button>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-white/5 space-y-2">
              <p className="text-[9px] font-mono tracking-widest text-white/20">
                HTTPS SECURED &middot; {fakeDomain.toUpperCase()}
              </p>
              <p className="text-[9px] font-mono tracking-widest text-white/20">
                NODE-{initials}-04279
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
