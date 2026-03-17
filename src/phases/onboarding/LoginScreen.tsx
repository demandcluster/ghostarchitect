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
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--bg-primary)" }}>
      {/* Simulation disclaimer */}
      <div className="w-full max-w-sm px-4 py-3 rounded-lg flex items-start gap-3 shadow-[0_0_12px_rgba(234,88,12,0.15)]" style={{ background: "var(--warning-subtle)", borderColor: "var(--warning)", borderWidth: "2px", borderStyle: "solid" }}>
        <span className="text-lg leading-none mt-0.5 flex-shrink-0" style={{ color: "var(--warning)" }}>⚠</span>
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-xs tracking-widest uppercase" style={{ color: "var(--warning)" }}>
            Simulation — Training Only
          </span>
          <p className="text-sm leading-snug" style={{ color: "#9a671d" }}>
            Do <span className="font-bold">not</span> enter real credentials.
            Use a made-up username and password.
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-window)", border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-window)" }}
      >
        {/* Top banner */}
        <div
          className="h-20 flex flex-col items-center justify-center"
          style={{ background: "linear-gradient(135deg, var(--window-header-from), var(--window-header-to))" }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt={teamName} className="w-10 h-10 rounded-lg object-contain bg-white/10 p-1" />
          ) : (
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-sm font-bold" style={{ color: "var(--window-header-text)" }}>
              {initials}
            </div>
          )}
          <p className="text-sm font-medium mt-1" style={{ color: "var(--window-header-text)" }}>
            {teamName} Identity Platform
          </p>
        </div>

        {/* Form */}
        <div className="p-8">
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Sign in to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  background: "var(--bg-window-sunken)",
                  border: "1px solid var(--border-strong)",
                  color: "var(--text-primary)"
                }}
                placeholder="your.name"
                autoComplete="off"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Password
                </label>
                {strength !== "empty" && (
                  <span className={`text-[11px] font-medium`}>
                    {meta.label}
                  </span>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  background: "var(--bg-window-sunken)",
                  border: "1px solid var(--border-strong)",
                  color: "var(--text-primary)"
                }}
                placeholder="Enter password"
                autoComplete="new-password"
              />
              {/* Strength bar */}
              {strength !== "empty" && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3].map((bar) => (
                    <div
                      key={bar}
                      className={`h-1 flex-1 rounded-full transition-colors`}
                      style={{
                        background: bar <= meta.bars ? meta.barClass : "var(--border-strong)"
                      }}
                    />
                  ))}
                </div>
              )}
              {strength === "weak" && password && (
                <p className="text-[11px] mt-1" style={{ color: "var(--danger)" }}>
                  Weak passwords put your account at risk. Use 12+ chars with mixed case, numbers, and symbols.
                </p>
              )}
            </div>

            {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}

            <button
              type="submit"
              className="w-full text-white rounded-lg py-2.5 font-medium text-sm transition-colors"
              style={{ background: "var(--accent)" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--accent)"}
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 text-center space-y-1">
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              helpdesk@{fakeDomain}
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Secured by {teamName} IT Security
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
