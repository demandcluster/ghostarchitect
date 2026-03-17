"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useScoreStore } from "@/stores/scoreStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useGameStore } from "@/stores/gameStore";

interface PasswordPuzzleProps {
  onComplete: () => void;
}

function computeEntropy(password: string): number {
  let charsetSize = 0;
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;
  if (charsetSize === 0) return 0;
  return Math.round(password.length * Math.log2(charsetSize));
}

function crackTime(entropy: number): string {
  // Assume 10 billion guesses/sec (modern GPU cluster)
  const seconds = Math.pow(2, entropy) / 1e10;
  if (seconds < 1) return "instant";
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
  const years = seconds / 31536000;
  if (years < 1000) return `${Math.round(years)} years`;
  if (years < 1e6) return `${Math.round(years / 1000)}K years`;
  return `${Math.round(years / 1e6)}M+ years`;
}

function strengthLabel(entropy: number): {
  label: string;
  color: string;
} {
  const time = crackTime(entropy);
  if (entropy < 28) return { label: `Very Weak — cracked in ${time}`, color: "var(--danger)" };
  if (entropy < 40) return { label: `Weak — cracked in ${time}`, color: "var(--danger)" };
  if (entropy < 60) return { label: `Fair — cracked in ${time}`, color: "var(--warning)" };
  if (entropy < 80) return { label: `Strong — cracked in ${time}`, color: "var(--success)" };
  return { label: `Very Strong — cracked in ${time}`, color: "var(--success)" };
}

export function PasswordPuzzle({ onComplete }: PasswordPuzzleProps) {
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const addAction = useScoreStore((s) => s.addAction);
  const addFlag = useNarrativeStore((s) => s.addFlag);
  const setDecision = useNarrativeStore((s) => s.setDecision);
  const teamName = useGameStore((s) => s.teamName);

  const entropy = useMemo(() => computeEntropy(password), [password]);
  const strength = useMemo(() => strengthLabel(entropy), [entropy]);
  const crack = useMemo(() => crackTime(entropy), [entropy]);

  const handleSubmit = () => {
    setDecision("password_entropy", String(entropy));

    let passwordPoints: number;
    if (entropy >= 80) {
      passwordPoints = 50;
      addFlag("chose_strong_password");
    } else if (entropy >= 60) {
      passwordPoints = 35;
      addFlag("chose_strong_password");
    } else if (entropy >= 40) {
      passwordPoints = 15;
    } else {
      passwordPoints = 5;
    }

    addAction({
      id: "password-strength",
      category: "passwordHygiene",
      points: passwordPoints,
      maxPoints: 50,
      label: `Password strength: ${strength.label} (${entropy} bits)`,
    });

    setSubmitted(true);
  };

  return (
    <div className="overflow-auto h-full">
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-primary mb-2">
        Create Your {teamName} Password
      </h2>
      <p className="text-sm text-secondary mb-6">
        Your password must meet {teamName} security policy. Use the entropy meter
        to gauge strength.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">
            New Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitted}
            className="w-full px-3 py-2 bg-window-sunken border border rounded text-sm font-mono text-primary focus:outline-none focus:border-accent"
            placeholder="Enter a strong password or passphrase"
            autoComplete="new-password"
          />
        </div>

        {/* Entropy meter */}
        {password.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <div className="p-4 bg-window-sunken rounded-lg border border">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-secondary">
                  Entropy: {entropy} bits
                </span>
                <span style={{ color: strength.color }} className="font-medium">
                  {strength.label}
                </span>
              </div>

              {/* Bar */}
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: strength.color,
                    width: `${Math.min(100, (entropy / 100) * 100)}%`,
                    transition: "width 300ms cubic-bezier(0.4,0,0.2,1)",
                  }}
                />
              </div>

              {/* Crack time */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">
                  Brute-force time (10B guesses/sec):
                </span>
                <span
                  className="font-mono font-medium"
                  style={{ color: strength.color }}
                >
                  {crack}
                </span>
              </div>

              {/* Tip */}
              <div className="mt-3 text-[11px] text-muted">
                {entropy < 40
                  ? 'Tip: Try a passphrase like "correct-horse-battery-staple" — long passphrases are stronger and easier to remember.'
                  : entropy < 60
                    ? "Good start. Adding more characters or mixing in symbols will increase entropy significantly."
                    : "Great password strength! This would resist modern brute-force attacks."}
              </div>
            </div>
          </motion.div>
        )}

        {/* Feedback after submit */}
        {submitted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-4 rounded-lg border ${
              entropy >= 60
                ? "bg-[var(--success-subtle)] border-[var(--success)]/35"
                : "bg-[var(--warning-subtle)] border-[var(--warning)]/35"
            }`}
          >
            {entropy >= 60 ? (
              <p className="text-sm text-[var(--success)]">
                Strong password! At {entropy} bits of entropy, this would take{" "}
                <strong>{crack}</strong> to brute-force.
              </p>
            ) : (
              <p className="text-sm text-[var(--warning)]">
                Your password at {entropy} bits could be cracked in{" "}
                <strong>{crack}</strong>. In a real environment, weak passwords
                are one of the top entry points for attackers.
              </p>
            )}
          </motion.div>
        )}

        {!submitted && password.length > 0 && entropy < 30 && (
          <p className="text-xs text-[var(--danger)] font-medium">
            Password too weak to proceed. Minimum strength required.
          </p>
        )}

        <button
          onClick={submitted ? onComplete : handleSubmit}
          disabled={!submitted && (password.length < 1 || entropy < 30)}
          className="w-full py-2 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {submitted ? "Continue" : "Set Password"}
        </button>
      </div>
    </div>
    </div>
  );
}
