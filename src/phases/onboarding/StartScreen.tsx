"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { getGameService } from "@/services/config/serviceConfig";

const PRIVACY_ACK_KEY = "ghost-architect:privacyAck";

function BreachLogo() {
  const [glitchPhase, setGlitchPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchPhase((p) => (p + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative inline-block">
      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 animate-scan"
          style={{
            background:
              "linear-gradient(transparent 50%, rgba(0,229,51,0.03) 50%, transparent 50.1%)",
            backgroundSize: "100% 4px"
          }}
        />
      </div>

      {/* Subtle digital noise */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          opacity: "0.02"
        }}
      />

      {/* Glitch overlay */}
      <AnimatePresence mode="wait">
        {glitchPhase === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent 45%, rgba(0,229,51,0.08) 50%, transparent 55%)"
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main logo */}
      <motion.img
        src="/ghostarchi.png"
        alt="Ghost Architect Logo"
        className="relative w-full max-w-2xl md:max-w-4xl object-contain"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{
          opacity: 1,
          scale: [0.6, 0.62, 0.6],
          filter: glitchPhase === 1 ? "hue-rotate(2deg)" : "hue-rotate(0deg)"
        }}
        transition={{
          opacity: { duration: 0.8 },
          scale: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          filter: { duration: 0.8 }
        }}
        style={{ filter: "drop-shadow(0 0 20px rgba(0,229,51,0.15))" }}
      />
    </div>
  );
}

interface PrivacyModalProps {
  onAccept: () => void;
  onNoStore: () => void;
}

function PrivacyModal({ onAccept, onNoStore }: PrivacyModalProps) {
  const [simulationChecked, setSimulationChecked] = useState(false);

  return (
    <motion.div
      key="privacy-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        key="privacy-panel"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative w-full max-w-md font-mono text-sm rounded-xl border border-[rgba(0,229,51,0.25)] bg-[#0a0e14] p-8 shadow-[0_0_60px_rgba(0,229,51,0.08)]"
      >
        {/* Title */}
        <div className="mb-6">
          <p className="text-[10px] text-[var(--accent)] tracking-[0.2em] mb-1 opacity-70">
            SYSTEM NOTICE
          </p>
          <h2 className="text-base font-bold tracking-widest text-white uppercase">
            Data &amp; Privacy Notice
          </h2>
          <div className="mt-2 h-px w-full bg-[rgba(0,229,51,0.15)]" />
        </div>

        {/* Content rows */}
        <div className="space-y-4 text-[12px] leading-relaxed text-[var(--text-secondary)]">
          <div>
            <span className="text-[var(--accent)] font-semibold">
              WHAT WE COLLECT
            </span>
            <p className="mt-1 text-[var(--text-muted)]">
              An anonymous ID (random UUID), your chosen display name, and your
              game scores. No email address. No real account.
            </p>
          </div>

          <div>
            <span className="text-[var(--accent)] font-semibold">
              WHO SEES IT
            </span>
            <p className="mt-1 text-[var(--text-muted)]">
              Your trainer can see your display name, scores, and game outcome.
              No data is sold or shared with third parties.
            </p>
          </div>

          <div>
            <span className="text-[var(--accent)] font-semibold">HOW LONG</span>
            <p className="mt-1 text-[var(--text-muted)]">
              Session data is deleted when your trainer&apos;s team expires.
            </p>
          </div>

          <div>
            <span className="text-[var(--accent)] font-semibold">
              YOUR RIGHTS
            </span>
            <p className="mt-1 text-[var(--text-muted)]">
              You can delete your session data at any time from the end-of-game
              screen.
            </p>
          </div>
        </div>

        {/* Simulation checkbox */}
        <label className="mt-6 flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5 flex-shrink-0">
            <input
              type="checkbox"
              checked={simulationChecked}
              onChange={(e) => setSimulationChecked(e.target.checked)}
              className="sr-only"
            />
            <div
              className="w-4 h-4 border rounded-sm transition-colors"
              style={{
                borderColor: simulationChecked
                  ? "var(--accent)"
                  : "rgba(0,229,51,0.3)",
                background: simulationChecked ? "var(--accent)" : "transparent"
              }}
            >
              {simulationChecked && (
                <svg
                  className="w-full h-full text-black"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors leading-relaxed">
            I understand this is a simulation. I will not enter real credentials
            or personal information.
          </span>
        </label>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => {
              if (!simulationChecked) return;
              localStorage.setItem(PRIVACY_ACK_KEY, "1");
              onAccept();
            }}
            disabled={!simulationChecked}
            className="w-full border border-[var(--accent)] text-[var(--accent)] font-mono px-6 py-2.5 text-xs tracking-widest hover:bg-[var(--accent)] hover:text-black transition-all hover:shadow-[0_0_20px_rgba(0,229,51,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--accent)]"
          >
            ACCEPT &amp; CONTINUE
          </button>

          <button
            onClick={onNoStore}
            className="w-full text-[var(--text-muted)] text-[10px] tracking-wider hover:text-[var(--text-secondary)] transition-colors py-1"
          >
            Play without data storage
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [playerHandle, setPlayerHandle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasRestoredSession, setHasRestoredSession] = useState(false);
  const [restoredHandle, setRestoredHandle] = useState<string | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [noStore, setNoStore] = useState(false);

  const setTeamId = useGameStore((s) => s.setTeamId);
  const setPlayerHandleStore = useGameStore((s) => s.setPlayerHandle);
  const setSessionId = useGameStore((s) => s.setSessionId);
  const initSession = useGameStore((s) => s.initSession);
  const setFakeDomain = useGameStore((s) => s.setFakeDomain);
  const setTeamName = useGameStore((s) => s.setTeamName);
  const setLogoUrl = useGameStore((s) => s.setLogoUrl);

  useEffect(() => {
    const savedHandle = localStorage.getItem("ghost-architect:playerHandle");
    const savedSessionId = localStorage.getItem("ghost-architect:sessionId");
    if (savedHandle && savedSessionId) {
      setHasRestoredSession(true);
      setRestoredHandle(savedHandle);
      setPlayerHandle(savedHandle);
    }

    // Show privacy modal if not yet acknowledged
    const ack = localStorage.getItem(PRIVACY_ACK_KEY);
    if (!ack) {
      setShowPrivacyModal(true);
    }
  }, []);

  const handlePrivacyAccept = () => {
    setShowPrivacyModal(false);
  };

  const handleNoStore = () => {
    setNoStore(true);
    setShowPrivacyModal(false);
  };

  const handleContinue = () => {
    const savedHandle = localStorage.getItem("ghost-architect:playerHandle");
    const savedTeamId = localStorage.getItem("ghost-architect:teamId");
    const savedSessionId = localStorage.getItem("ghost-architect:sessionId");
    if (savedHandle) setPlayerHandleStore(savedHandle);
    if (savedTeamId) setTeamId(savedTeamId);
    if (savedSessionId) setSessionId(savedSessionId);
    onStart();
  };

  const handleNewSession = () => {
    localStorage.removeItem("ghost-architect:playerHandle");
    localStorage.removeItem("ghost-architect:teamId");
    localStorage.removeItem("ghost-architect:sessionId");
    setHasRestoredSession(false);
    setRestoredHandle(null);
    setPlayerHandle("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const service = await getGameService();
      const anonymousId =
        crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

      const session = await service.joinTeam(
        inviteCode.trim().toUpperCase(),
        anonymousId,
        playerHandle.trim() || undefined
      );

      if (session.teamId) {
        setTeamId(session.teamId);
      }
      if (session.teamName) {
        setTeamName(session.teamName);
      }
      if (session.fakeDomain) {
        setFakeDomain(session.fakeDomain);
      }
      if ((session as { logoUrl?: string | null }).logoUrl) {
        setLogoUrl((session as { logoUrl?: string | null }).logoUrl ?? null);
      }
      // Use the server-assigned handle (may differ if dedup occurred)
      const assignedHandle =
        session.playerHandle ?? playerHandle.trim() ?? null;
      if (assignedHandle) {
        setPlayerHandleStore(assignedHandle);
      }
      // In no-store mode keep session id in memory only — don't persist to localStorage
      if (noStore) {
        useGameStore.setState({ sessionId: session.id });
      } else {
        setSessionId(session.id);
      }
      onStart();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to join. Check your invite code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (playerHandle.trim()) {
      setPlayerHandleStore(playerHandle.trim());
    }
    // Only persist session if the player consented; no-store players play ephemerally
    if (!noStore) {
      initSession();
    }
    onStart();
  };

  return (
    <>
      <AnimatePresence>
        {showPrivacyModal && (
          <PrivacyModal
            onAccept={handlePrivacyAccept}
            onNoStore={handleNoStore}
          />
        )}
      </AnimatePresence>

      <div
        className="relative flex flex-col items-center justify-center h-screen overflow-hidden"
        style={{ background: "var(--bg-primary)" }}
      >
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(rgba(0,229,51,0.15) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)",
            maskImage:
              "radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)"
          }}
        />

        {/* Ghost ASCII art */}
        <div className="absolute top-8 left-8 text-gray-700 text-xs font-mono select-none whitespace-pre">
          {`  .-.
 (o o)
 | O |
  '~'`}
        </div>

        {/* Session restore banner */}
        {hasRestoredSession && restoredHandle && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -20 }}
            className="absolute top-8 font-mono text-xs z-50"
          >
            <div className="border border-[rgba(0,229,51,0.2)] bg-[rgba(0,229,51,0.05)] px-6 py-1 rounded">
              <span className="text-[var(--text-muted)]">SESSION RESTORED</span>
              <span className="text-[var(--accent)] mx-2">&mdash;</span>
              <span className="text-[var(--text-secondary)]">
                Continue as{" "}
                <span className="text-[var(--accent)]">{restoredHandle}</span>?
              </span>
              <span className="ml-4 space-x-3">
                <button
                  onClick={handleContinue}
                  className="text-[var(--accent)] hover:underline"
                >
                  [CONTINUE]
                </button>
                <button
                  onClick={handleNewSession}
                  className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  [NEW SESSION]
                </button>
              </span>
            </div>
          </motion.div>
        )}

        {/* Title section */}
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -40 }}
          transition={{ duration: 0.8 }}
          className="text-center "
        >
          <BreachLogo />
        </motion.div>

        {/* Input section */}
        <motion.form
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 0.8, y: -160 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          onSubmit={handleSubmit}
          className="relative z-10 w-full max-w-xs space-y-6 font-mono text-sm rounded-2xl border border-[rgba(0,229,51,0.12)] bg-[rgba(0,0,0,0.4)] backdrop-blur-sm p-4"
        >
          <div>
            <label className="text-[var(--accent)] text-xs mb-1 uppercase tracking-wider block">
              {"> "}OPERATOR HANDLE
            </label>
            <input
              type="text"
              value={playerHandle}
              onChange={(e) => setPlayerHandle(e.target.value)}
              className="bg-transparent border-0 border-b border-[rgba(0,229,51,0.3)] text-white outline-none w-full pb-1 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] transition-[border-color,box-shadow]"
              style={{ caretColor: "var(--accent)" }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 0 0 var(--accent)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
              placeholder="anonymous"
              maxLength={24}
            />
          </div>

          <div>
            <label className="text-[var(--accent)] text-xs mb-1 uppercase tracking-wider block">
              {"> "}TEAM INVITE CODE
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value.toUpperCase());
                setError("");
              }}
              className="bg-transparent border-0 border-b border-[rgba(0,229,51,0.3)] text-white outline-none w-full pb-1 uppercase tracking-[0.3em] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] transition-[border-color,box-shadow]"
              style={{ caretColor: "var(--accent)" }}
              onFocus={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 0 0 var(--accent)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
              placeholder="XXXXXX"
              maxLength={6}
            />
          </div>

          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

          <div className="pt-4">
            {inviteCode.trim().length > 0 ? (
              <button
                type="submit"
                disabled={loading || inviteCode.trim().length < 6}
                className="w-full border border-[var(--accent)] text-[var(--accent)] font-mono px-8 py-3 text-sm hover:bg-[var(--accent)] hover:text-black transition-all hover:shadow-[0_0_20px_rgba(0,229,51,0.4)] disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--accent)]"
              >
                {loading ? "CONNECTING..." : "INITIALIZE SESSION"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSkip}
                className="w-full border border-[var(--accent)] text-[var(--accent)] font-mono px-8 py-3 text-sm hover:bg-[var(--accent)] hover:text-black transition-all hover:shadow-[0_0_20px_rgba(0,229,51,0.4)]"
              >
                START SOLO
              </button>
            )}
          </div>
        </motion.form>

        {/* Footer */}
        <div className="absolute bottom-4 flex flex-col items-center gap-2 font-mono text-[10px] text-[var(--text-muted)]">
          <p>SIMULATION — NO REAL DATA</p>

          {/* Compliance badges */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {[
              {
                label: "No Email Collection",
                title:
                  "Players need no account. Only an optional display name is stored."
              },
              {
                label: "No Real Accounts",
                title:
                  "Players are identified by an anonymous UUID only. No registration required."
              },
              {
                label: "Fictional PII Only",
                title:
                  "All personal data in simulation content is entirely fictitious and structurally invalid."
              },
              {
                label: "Invite-Code Access",
                title:
                  "Data collection is limited to participants explicitly invited by a trainer."
              },
              {
                label: "Privacy by Design",
                title:
                  "Data minimisation applied throughout. Trainer auth uses short-lived JWTs with no email storage."
              }
            ].map(({ label, title }) => (
              <span
                key={label}
                title={title}
                className="border border-[rgba(0,229,51,0.2)] bg-[rgba(0,229,51,0.04)] text-[var(--accent)] px-2 py-0.5 rounded text-[9px] tracking-wide cursor-default select-none opacity-70 hover:opacity-100 transition-opacity"
              >
                {label}
              </span>
            ))}
          </div>

          <p>
            Free to play &mdash; offered by{" "}
            <span className="text-[var(--text-secondary)]">Demandcluster</span>{" "}
            &middot; developed by{" "}
            <span className="text-[var(--text-secondary)]">Ron van Etten</span>
          </p>
        </div>
      </div>
    </>
  );
}
