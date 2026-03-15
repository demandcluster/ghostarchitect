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

    // Score password hygiene
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] gap-4">
      {/* Simulation disclaimer */}
      <div className="w-full max-w-sm px-4 py-3 bg-[var(--warning-subtle)] border-2 border-[var(--warning)] rounded-lg flex items-start gap-3 shadow-[0_0_12px_rgba(255,184,0,0.15)]">
        <span className="text-[var(--warning)] text-lg leading-none mt-0.5 flex-shrink-0">⚠</span>
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-[var(--warning)] text-xs tracking-widest uppercase">
            Simulation — Training Only
          </span>
          <p className="text-sm leading-snug text-[#7a4f00]" style={{ color: 'color-mix(in srgb, var(--warning) 80%, #000)' }}>
            Do <span className="font-bold">not</span> enter real credentials.
            Use a made-up username and password.
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-[var(--bg-window)] border border-[var(--border-strong)] rounded-2xl overflow-hidden"
        style={{ boxShadow: "var(--shadow-window)" }}
      >
        {/* Top banner */}
        <div
          className="h-20 flex flex-col items-center justify-center"
          style={{ background: "linear-gradient(135deg, var(--window-header-from), var(--window-header-to))" }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt={teamName} className="w-10 h-10 rounded-lg object-contain bg-white/10 p-1" />
          ) : (
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-[var(--window-header-text)] text-sm font-bold">
              {initials}
            </div>
          )}
          <p className="text-[var(--window-header-text)] text-sm font-medium mt-1">
            {teamName} Identity Platform
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <p className="text-sm text-[var(--text-muted)] mb-6">Sign in to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                className="w-full bg-[var(--bg-window-sunken)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                placeholder="your.name"
                autoComplete="off"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Password
                </label>
                {strength !== "empty" && (
                  <span className={`text-[11px] font-medium ${
                    strength === "weak"
                      ? "text-[var(--danger)]"
                      : strength === "fair"
                        ? "text-[var(--warning)]"
                        : "text-[var(--success)]"
                  }`}>
                    {meta.label}
                  </span>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="w-full bg-[var(--bg-window-sunken)] border border-[var(--border-strong)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                placeholder="Enter password"
                autoComplete="new-password"
              />
              {/* Strength bar */}
              {strength !== "empty" && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3].map((bar) => (
                    <div
                      key={bar}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        bar <= meta.bars ? meta.barClass : "bg-[var(--border-strong)]"
                      }`}
                    />
                  ))}
                </div>
              )}
              {strength === "weak" && password && (
                <p className="text-[11px] text-[var(--danger)] mt-1">
                  Weak passwords put your account at risk. Use 12+ chars with mixed case, numbers, and symbols.
                </p>
              )}
            </div>

            {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

            <button
              type="submit"
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg py-2.5 font-medium text-sm transition-colors"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 text-center space-y-1">
            <p className="text-[11px] text-[var(--text-muted)]">
              helpdesk@{fakeDomain}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Secured by {teamName} IT Security
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
