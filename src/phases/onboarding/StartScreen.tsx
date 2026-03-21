"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { getGameService } from "@/services/config/serviceConfig";

const PRIVACY_ACK_KEY = "ghost-architect:privacyAck";

function BreachLogo() {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    // Intermittent glitch trigger
    const triggerGlitch = () => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 150 + Math.random() * 300);
      
      const nextDelay = 3000 + Math.random() * 7000;
      setTimeout(triggerGlitch, nextDelay);
    };

    const initialTimeout = setTimeout(triggerGlitch, 5000);
    return () => clearTimeout(initialTimeout);
  }, []);

  return (
    <div className="relative group cursor-default select-none">
      {/* Glow effect behind logo */}
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl opacity-20 bg-[var(--accent)]"
        animate={{
          scale: isGlitching ? [1, 1.4, 0.9, 1.1] : [1, 1.1, 1],
          opacity: isGlitching ? [0.2, 0.5, 0.1, 0.3] : [0.15, 0.25, 0.15],
        }}
        transition={{ 
          duration: isGlitching ? 0.2 : 4, 
          repeat: isGlitching ? 0 : Infinity, 
          ease: "easeInOut" 
        }}
      />

      <div className="relative">
        {/* Chromatic Aberration Layers (only visible during glitch) */}
        <AnimatePresence>
          {isGlitching && (
            <>
              {/* Red shift */}
              <motion.img
                src="/ghostarchi.png"
                alt=""
                className="absolute inset-0 w-full max-w-[280px] md:max-w-[360px] object-contain mix-blend-screen"
                initial={{ x: -5, opacity: 0 }}
                animate={{ x: [-2, 5, -3], opacity: 0.5 }}
                exit={{ opacity: 0 }}
                style={{ filter: "hue-rotate(300deg) saturate(3) brightness(1.2)" }}
              />
              {/* Blue shift */}
              <motion.img
                src="/ghostarchi.png"
                alt=""
                className="absolute inset-0 w-full max-w-[280px] md:max-w-[360px] object-contain mix-blend-screen"
                initial={{ x: 5, opacity: 0 }}
                animate={{ x: [3, -5, 2], opacity: 0.5 }}
                exit={{ opacity: 0 }}
                style={{ filter: "hue-rotate(180deg) saturate(3) brightness(1.2)" }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Main logo */}
        <motion.img
          src="/ghostarchi.png"
          alt="Ghost Architect Logo"
          className="relative w-full max-w-[280px] md:max-w-[360px] object-contain"
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            x: isGlitching ? [0, -2, 2, -1, 0] : 0,
            skewX: isGlitching ? [0, 10, -10, 5, 0] : 0,
            filter: isGlitching 
              ? "drop-shadow(0 0 30px rgba(0,229,51,0.5)) contrast(2) brightness(1.5)" 
              : "drop-shadow(0 0 30px rgba(0,229,51,0.25)) grayscale(0.2) contrast(1.1)",
          }}
          transition={{ 
            opacity: { duration: 1 },
            duration: 0.2,
            times: [0, 0.2, 0.4, 0.6, 1]
          }}
        />
      </div>
      
      {/* VHS-style tracking noise and scanlines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        {/* Primary Scanline */}
        <motion.div
          className="w-full h-[2px] bg-[var(--accent)] shadow-[0_0_10px_var(--accent)] opacity-50"
          initial={{ top: "-10%" }}
          animate={{ top: "110%" }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
          style={{ position: 'absolute' }}
        />
        {/* Secondary faint scanline */}
        <motion.div
          className="w-full h-[1px] bg-white opacity-20"
          initial={{ top: "-10%" }}
          animate={{ top: "110%" }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 2 }}
          style={{ position: 'absolute' }}
        />
        {/* Fixed 'tracking' noise lines */}
        <div className="absolute top-1/3 w-full h-[1px] bg-[var(--accent)] opacity-10" />
        <div className="absolute top-2/3 w-full h-[1px] bg-[var(--accent)] opacity-10" />
      </div>

      {/* Subtle Noise Texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Glitch lines overlay (Only active during glitch) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute w-full h-[2px] bg-white opacity-0"
          animate={{ 
            top: isGlitching ? ["20%", "80%", "40%"] : "50%",
            opacity: isGlitching ? [0, 0.8, 0] : 0,
            scaleX: isGlitching ? [1, 1.5, 1] : 1
          }}
          transition={{ duration: 0.2 }}
        />
      </div>
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,1,12,0.92)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        key="privacy-panel"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="relative w-full max-w-md rounded-2xl border border-[rgba(0,229,51,0.3)] bg-[#050709] p-8 shadow-[0_0_80px_rgba(0,229,51,0.15)]"
      >
        <div className="mb-8 text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-[rgba(0,229,51,0.1)] border border-[rgba(0,229,51,0.2)] text-[10px] text-[var(--accent)] tracking-[0.3em] font-bold mb-3 uppercase">
            System Protocol
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">
            Privacy &amp; Data Security
          </h2>
        </div>

        <div className="space-y-5 text-sm">
          <div className="flex gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0 shadow-[0_0_8px_var(--accent)]" />
            <p className="text-[var(--text-secondary)]">
              <strong className="text-white block mb-0.5">ANONYMOUS IDENTIFICATION</strong>
              No accounts or emails. We use a random UUID and your temporary handle.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0 shadow-[0_0_8px_var(--accent)]" />
            <p className="text-[var(--text-secondary)]">
              <strong className="text-white block mb-0.5">TRANSPARENT OVERSIGHT</strong>
              Your trainer can monitor progress and scores. Data is never shared with third parties.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0 shadow-[0_0_8px_var(--accent)]" />
            <p className="text-[var(--text-secondary)]">
              <strong className="text-white block mb-0.5">AUTOMATIC PURGE</strong>
              Session data is deleted when your team expires or upon your manual request.
            </p>
          </div>
        </div>

        <label className="mt-8 flex items-start gap-3 cursor-pointer group p-4 rounded-xl border border-dashed border-[rgba(0,229,51,0.2)] bg-[rgba(0,229,51,0.02)] hover:bg-[rgba(0,229,51,0.05)] transition-colors">
          <div className="relative mt-0.5 flex-shrink-0">
            <input
              type="checkbox"
              checked={simulationChecked}
              onChange={(e) => setSimulationChecked(e.target.checked)}
              className="sr-only"
            />
            <div
              className="w-5 h-5 border-2 rounded transition-all flex items-center justify-center"
              style={{
                borderColor: simulationChecked ? "var(--accent)" : "rgba(0,229,51,0.4)",
                background: simulationChecked ? "var(--accent)" : "transparent"
              }}
            >
              {simulationChecked && (
                <svg className="w-3.5 h-3.5 text-black stroke-[3]" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] group-hover:text-white transition-colors leading-relaxed">
            I understand this is a <strong className="text-[var(--accent)]">security simulation</strong>. I will not enter real passwords or sensitive personal information.
          </span>
        </label>

        <div className="mt-8 space-y-3">
          <button
            onClick={() => {
              if (!simulationChecked) return;
              localStorage.setItem(PRIVACY_ACK_KEY, "1");
              onAccept();
            }}
            disabled={!simulationChecked}
            className="w-full bg-[var(--accent)] text-black font-bold py-3.5 rounded-xl text-xs tracking-[0.2em] hover:brightness-110 transition-all hover:shadow-[0_0_30px_rgba(0,229,51,0.4)] disabled:opacity-30 disabled:cursor-not-allowed uppercase"
          >
            Acknowledge &amp; Enter
          </button>

          <button
            onClick={onNoStore}
            className="w-full text-[var(--text-muted)] text-[10px] tracking-widest hover:text-white transition-colors py-2 uppercase"
          >
            Play Ephemerally (No Storage)
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

    const ack = localStorage.getItem(PRIVACY_ACK_KEY);
    if (!ack) setShowPrivacyModal(true);
  }, []);

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
      const anonymousId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

      const session = await service.joinTeam(
        inviteCode.trim().toUpperCase(),
        anonymousId,
        playerHandle.trim() || undefined
      );

      if (session.teamId) setTeamId(session.teamId);
      if (session.teamName) setTeamName(session.teamName);
      if (session.fakeDomain) setFakeDomain(session.fakeDomain);
      if ((session as { logoUrl?: string | null }).logoUrl) setLogoUrl((session as { logoUrl?: string | null }).logoUrl as string);
      
      const assignedHandle = session.playerHandle ?? playerHandle.trim() ?? null;
      if (assignedHandle) setPlayerHandleStore(assignedHandle);
      
      if (noStore) {
        useGameStore.setState({ sessionId: session.id });
      } else {
        setSessionId(session.id);
      }
      onStart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join. Check your invite code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (playerHandle.trim()) setPlayerHandleStore(playerHandle.trim());
    if (!noStore) initSession();
    onStart();
  };

  return (
    <>
      <AnimatePresence>
        {showPrivacyModal && (
          <PrivacyModal
            onAccept={() => setShowPrivacyModal(false)}
            onNoStore={() => { setNoStore(true); setShowPrivacyModal(false); }}
          />
        )}
      </AnimatePresence>

      <div className="relative flex flex-col items-center min-h-screen bg-[var(--bg-primary)] overflow-hidden px-6 pt-12 md:pt-24 pb-32">
        {/* Technical Background */}
        <div 
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ opacity: 0.4 }}
        >
          {/* Animated Grid */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(rgba(0,229,51,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,51,0.05) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 100%)'
            }}
          />
          {/* Scanning Line */}
          <motion.div 
            className="absolute left-0 w-full h-32 bg-gradient-to-b from-transparent via-[rgba(0,229,51,0.03)] to-transparent"
            animate={{ top: ['-20%', '120%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
        </div>

        {/* Top Navigation / Status Area */}
        <div className="relative w-full max-w-5xl flex flex-col items-center gap-6 z-20">
          <AnimatePresence>
            {hasRestoredSession && restoredHandle && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-fit"
              >
                <div className="flex items-center gap-4 border border-[rgba(0,229,51,0.3)] bg-[rgba(0,229,51,0.08)] backdrop-blur-md px-5 py-2 rounded-full font-mono text-[10px] md:text-xs">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                  <span className="text-white tracking-widest">
                    ACTIVE SESSION: <span className="text-[var(--accent)] uppercase">{restoredHandle}</span>
                  </span>
                  <div className="h-3 w-[1px] bg-[rgba(0,229,51,0.2)] mx-1" />
                  <div className="flex gap-3">
                    <button onClick={handleContinue} className="text-[var(--accent)] hover:text-white transition-colors">[CONTINUE]</button>
                    <button onClick={handleNewSession} className="text-white/40 hover:text-white transition-colors">[PURGE]</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <BreachLogo />
        </div>

        {/* Main Interaction Area */}
        <div className="relative flex flex-col items-center mt-12 md:mt-16 w-full max-w-sm z-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-full"
          >
            <form onSubmit={handleSubmit} className="w-full space-y-8 bg-[rgba(0,1,12,0.6)] backdrop-blur-xl p-8 rounded-3xl border border-[rgba(0,229,51,0.15)] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[var(--accent)] text-[10px] font-bold tracking-[0.2em] uppercase block px-1">
                    Operator Designation
                  </label>
                  <input
                    type="text"
                    value={playerHandle}
                    onChange={(e) => setPlayerHandle(e.target.value)}
                    className="w-full bg-[rgba(0,229,51,0.03)] border border-[rgba(0,229,51,0.2)] rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--accent)] focus:bg-[rgba(0,229,51,0.06)] transition-all font-mono placeholder:text-white/30"
                    placeholder="anonymous_operator"
                    maxLength={24}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[var(--accent)] text-[10px] font-bold tracking-[0.2em] uppercase block px-1">
                    Team Protocol Code
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setError(""); }}
                    className="w-full bg-[rgba(0,229,51,0.03)] border border-[rgba(0,229,51,0.2)] rounded-xl px-4 py-3 text-white outline-none focus:border-[var(--accent)] focus:bg-[rgba(0,229,51,0.06)] transition-all font-mono tracking-[0.4em] uppercase placeholder:text-white/30"
                    placeholder="XXXXXX"
                    maxLength={6}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-[rgba(255,45,85,0.1)] border border-[rgba(255,45,85,0.3)] rounded-lg p-3 text-[11px] text-[var(--danger)] text-center font-mono">
                  ERROR: {error.toUpperCase()}
                </div>
              )}

              <div className="pt-2">
                {inviteCode.trim().length > 0 ? (
                  <button
                    type="submit"
                    disabled={loading || inviteCode.trim().length < 6}
                    className="w-full bg-[var(--accent)] text-black font-bold py-4 rounded-xl text-xs tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all hover:shadow-[0_0_25px_rgba(0,229,51,0.4)] disabled:opacity-20 disabled:cursor-not-allowed uppercase"
                  >
                    {loading ? "INITIALIZING..." : "COMMENCE SIMULATION"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="w-full border border-[var(--accent)] text-[var(--accent)] font-bold py-4 rounded-xl text-xs tracking-[0.2em] hover:bg-[var(--accent)] hover:text-black transition-all hover:shadow-[0_0_20px_rgba(0,229,51,0.2)] uppercase"
                  >
                    PROCEED SOLO
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>

        {/* Immersive Footer */}
        <div className="absolute bottom-8 w-full px-6 z-20 flex flex-col items-center gap-6">
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar max-w-full justify-center">
            {[
              "SECURED PROTOCOL",
              "ZERO DATA RETENTION",
              "PRIVACY BY DESIGN",
              "TRAINING SIMULATION"
            ].map((tag) => (
              <span key={tag} className="whitespace-nowrap px-3 py-1 rounded border border-white/5 bg-white/[0.02] text-[9px] text-white/30 font-mono tracking-widest uppercase">
                {tag}
              </span>
            ))}
          </div>
          
          <div className="text-center font-mono text-[9px] tracking-widest text-white/20 uppercase">
            &copy; 2026 GHOST ARCHITECT &middot; DEMANDCLUSTER &middot; TECHNICAL SIMULATION v2.4.0
          </div>
        </div>
      </div>
    </>
  );
}
