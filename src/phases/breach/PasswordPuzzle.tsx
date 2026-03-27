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

type Phase = "reveal" | "verify" | "reset";

export function PasswordPuzzle({ onComplete }: PasswordPuzzleProps) {
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyFailed, setVerifyFailed] = useState(false);

  const addAction = useScoreStore((s) => s.addAction);
  const addFlag = useNarrativeStore((s) => s.addFlag);
  const setDecision = useNarrativeStore((s) => s.setDecision);
  const decisions = useNarrativeStore((s) => s.decisions);
  const teamName = useGameStore((s) => s.teamName);

  const oldPassword = decisions["login_password"] ?? "";
  const oldEntropy = useMemo(() => computeEntropy(oldPassword), [oldPassword]);
  const oldCrack = useMemo(() => crackTime(oldEntropy), [oldEntropy]);
  const oldWasStrong = oldEntropy >= 60;

  const [phase, setPhase] = useState<Phase>(() => {
    if (!oldPassword) return "reset";
    return oldWasStrong ? "verify" : "reveal";
  });

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

  // --- VERIFY phase (strong old password path) ---
  if (phase === "verify") {
    const isMatch = verifyInput === oldPassword;
    return (
      <div className="overflow-auto h-full">
        <div className="p-6 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Verify Your Identity
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
              Your credentials were exposed in the breach. Before rotating, confirm
              you still know your current password.
            </p>

            <div className="space-y-4">
              <input
                type="password"
                value={verifyInput}
                onChange={(e) => { setVerifyInput(e.target.value); setVerifyFailed(false); }}
                className="w-full px-3.5 py-2.5 bg-[var(--bg-window-sunken)] border border-[var(--border)] rounded-xl text-base font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
                placeholder="Re-enter your current password"
                autoComplete="current-password"
              />

              {verifyFailed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 rounded-lg border bg-[var(--warning-subtle)] border-[var(--warning)]/35"
                >
                  <p className="text-sm text-[var(--warning)] leading-relaxed">
                    Incorrect. If you can&apos;t remember it, that&apos;s a risk —
                    strong passwords you can&apos;t recall are often written down
                    insecurely. A password manager solves this.
                  </p>
                  <button
                    onClick={() => setPhase("reset")}
                    className="mt-3 text-sm underline text-[var(--warning)]"
                  >
                    Proceed to reset anyway
                  </button>
                </motion.div>
              )}

              <button
                onClick={() => {
                  if (isMatch) {
                    const pts = oldEntropy >= 80 ? 50 : 35;
                    addAction({
                      id: "password-strength",
                      category: "passwordHygiene",
                      points: pts,
                      maxPoints: 50,
                      label: `Remembered strong password (${oldEntropy} bits) — no reset required`,
                    });
                    addFlag("chose_strong_password");
                    addFlag("remembered_strong_password");
                    onComplete();
                  } else {
                    setVerifyFailed(true);
                  }
                }}
                disabled={verifyInput.length < 1}
                className="w-full py-2 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // --- REVEAL phase (weak/fair old password path) ---
  if (phase === "reveal") {
    const sl = strengthLabel(oldEntropy);
    return (
      <div className="overflow-auto h-full">
        <div className="p-6 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-xl font-bold text-[var(--danger)] mb-2">
              Compromised Credentials Detected
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
              Forensic analysis recovered your credentials from the attacker&apos;s
              exfiltration server.
            </p>

            <div className="p-4 bg-[var(--bg-window-sunken)] rounded-xl border border-[var(--danger)]/40 mb-6">
              <div className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-widest mb-2">
                Exposed Credential
              </div>
              <div className="font-mono text-base text-[var(--danger)] break-all mb-3">
                {oldPassword}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Entropy:</span>
                <span className="font-mono font-semibold" style={{ color: sl.color }}>
                  {oldEntropy} bits
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-[var(--text-secondary)]">Brute-force time:</span>
                <span className="font-mono font-semibold" style={{ color: sl.color }}>
                  {oldCrack}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-[var(--danger-subtle)] border-[var(--danger)]/35 mb-6">
              <p className="text-sm text-[var(--danger)] leading-relaxed">
                At {oldEntropy} bits, this password was trivial to crack once the
                hash was obtained. Low entropy is one of the top entry points
                attackers exploit post-breach.
              </p>
            </div>

            <button
              onClick={() => setPhase("reset")}
              className="w-full py-2 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Set New Password
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // --- RESET phase (all paths that need a new password) ---
  return (
    <div className="overflow-auto h-full">
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
        Reset Your Credentials
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-7 leading-relaxed max-w-[55ch]">
        Your previous password has been invalidated. Set a replacement that meets{" "}
        {teamName} security policy. Use the entropy meter to gauge strength.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            New Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitted}
            className="w-full px-3.5 py-2.5 bg-[var(--bg-window-sunken)] border border-[var(--border)] rounded-xl text-base font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)]"
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
            <div className="p-4 bg-[var(--bg-window-sunken)] rounded-xl border border-[var(--border)]">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-[var(--text-secondary)] font-medium">
                  Entropy: {entropy} bits
                </span>
                <span style={{ color: strength.color }} className="font-semibold">
                  {strength.label}
                </span>
              </div>

              {/* Bar */}
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    backgroundColor: strength.color,
                    width: `${Math.min(100, (entropy / 100) * 100)}%`,
                  }}
                />
              </div>

              {/* Crack time */}
              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-muted">
                  Brute-force time (10B guesses/sec):
                </span>
                <span
                  className="font-mono font-semibold"
                  style={{ color: strength.color }}
                >
                  {crack}
                </span>
              </div>

              {/* Tip */}
              <div className="mt-4 text-sm text-muted leading-relaxed">
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
