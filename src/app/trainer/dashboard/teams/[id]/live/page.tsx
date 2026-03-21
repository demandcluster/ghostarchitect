'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../../../AuthProvider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Team {
  id: string;
  name: string;
  fakeDomain: string | null;
  logoUrl: string | null;
  inviteCode: string;
  isActive: boolean;
}

interface LeaderboardEntry {
  rank: number;
  playerHandle: string;
  totalScore: number;
  endingReached?: string;
  completedAt?: string;
  phaseScores: Record<string, number>;
}

interface LeaderboardSnapshot {
  teamId: string;
  teamName: string;
  updatedAt: string;
  rankings: LeaderboardEntry[];
}

interface SessionRow {
  id: string;
  playerHandle: string | null;
  totalScore: number | null;
  completedAt: string | null;
  endingReached: string | null;
  phaseScores: Record<string, number>;
  deviceInfo: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RANK_COLORS: Record<number, string> = {
  0: '#FFD700',
  1: '#C0C0C0',
  2: '#CD7F32',
};

const ENDING_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  promoted: { bg: 'rgba(0,229,51,0.15)', color: '#00e533', label: 'PROMOTED' },
  lateral:  { bg: 'rgba(77,159,255,0.15)', color: '#4d9fff', label: 'LATERAL' },
  neutral:  { bg: 'rgba(74,85,104,0.30)', color: '#8fa3b8', label: 'NEUTRAL' },
  fired:    { bg: 'rgba(255,45,85,0.15)', color: '#ff2d55', label: 'FIRED' },
};

const CATEGORY_CONFIG = [
  { key: 'phishingIQ',        label: 'Phishing IQ',       color: 'var(--info)' },
  { key: 'passwordHygiene',   label: 'Password Hygiene',  color: 'var(--success)' },
  { key: 'networkSecurity',   label: 'Network Security',  color: 'var(--warning)' },
  { key: 'forensicSkill',     label: 'Forensic Skill',    color: 'var(--accent)' },
];

function derivePhase(s: SessionRow): string {
  const p = s.phaseScores ?? {};
  if ((p.forensicSkill ?? 0) > 0) return 'Investigation';
  if ((p.networkSecurity ?? 0) > 0) return 'Breach · Network';
  if ((p.passwordHygiene ?? 0) > 0) return 'Breach · Password';
  if ((p.phishingIQ ?? 0) > 0) return 'Breach · Email';
  return 'Onboarding';
}

function useLiveClock(): string {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreBar({ score, max = 100, color = 'var(--accent)' }: { score: number; max?: number; color?: string }) {
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', height: 6 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          height: '100%',
          background: `linear-gradient(90deg, ${color}, var(--accent-cyan, #00d4ff))`,
          borderRadius: 4,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
    </div>
  );
}

function EndingBadge({ ending }: { ending: string }) {
  const s = ENDING_STYLES[ending] ?? { bg: 'rgba(74,85,104,0.3)', color: '#8fa3b8', label: ending.toUpperCase() };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}40`,
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 11,
        fontFamily: 'inherit',
        fontWeight: 700,
        letterSpacing: '0.08em',
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function LiveDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { authFetch, accessToken, isLoading: authLoading } = useAuth();
  const clock = useLiveClock();

  const [team, setTeam] = useState<Team | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sseStatus, setSseStatus] = useState<'connecting' | 'connected' | 'reconnecting'>('connecting');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [flashedHandles, setFlashedHandles] = useState<Set<string>>(new Set());
  const prevScoresRef = useRef<Map<string, number>>(new Map());
  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- Data fetching ----------

  const fetchTeam = useCallback(async () => {
    if (!id) return;
    try {
      const res = await authFetch(`/api/v1/teams/${id}`);
      if (res.ok) setTeam(await res.json());
    } catch { /* silently ignore */ }
  }, [authFetch, id]);

  const fetchSessions = useCallback(async () => {
    if (!id) return;
    try {
      const res = await authFetch(`/api/v1/teams/${id}/sessions`);
      if (res.ok) setSessions(await res.json());
    } catch { /* silently ignore */ }
  }, [authFetch, id]);

  const [retryCount, setRetryCount] = useState(0);

  // ---------- SSE ----------

  useEffect(() => {
    if (!id || authLoading) return;
    
    let active = true;

    if (sseRef.current) {
      sseRef.current.close();
    }
    
    // Wrap in microtask to avoid setState warning if triggered synchronously
    Promise.resolve().then(() => {
      if (active) setSseStatus('connecting');
    });

    const es = new EventSource(`/api/v1/teams/${id}/leaderboard/stream`);
    sseRef.current = es;

    es.onopen = () => {
      if (active) setSseStatus('connected');
    };

    es.onmessage = (event) => {
      if (!active) return;
      setSseStatus('connected');
      try {
        const parsed: LeaderboardSnapshot = JSON.parse(event.data);
        const entries = parsed.rankings ?? [];

        // Detect score increases for flash animation
        const newFlashed = new Set<string>();
        entries.forEach((entry) => {
          const prev = prevScoresRef.current.get(entry.playerHandle);
          if (prev !== undefined && entry.totalScore > prev) {
            newFlashed.add(entry.playerHandle);
          }
          prevScoresRef.current.set(entry.playerHandle, entry.totalScore);
        });

        if (newFlashed.size > 0) {
          setFlashedHandles(newFlashed);
          setTimeout(() => {
            if (active) setFlashedHandles(new Set());
          }, 1200);
        }

        setLeaderboard(entries.slice().sort((a, b) => b.totalScore - a.totalScore));
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      if (!active) return;
      setSseStatus('reconnecting');
      es.close();
      sseRef.current = null;
      reconnectRef.current = setTimeout(() => {
        if (active) setRetryCount(prev => prev + 1);
      }, 3000);
    };

    return () => {
      active = false;
      es.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [id, accessToken, authLoading, retryCount]);

  // ---------- Effects ----------

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    
    let active = true;

    const init = async () => {
      if (!active) return;
      await Promise.all([fetchTeam(), fetchSessions()]);
    };

    init();

    pollRef.current = setInterval(() => {
      if (active) fetchSessions();
    }, 10_000);

    return () => {
      active = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [authLoading, fetchTeam, fetchSessions]);

  // ---------- Computed stats ----------

  const activeSessions = sessions.filter((s) => !s.completedAt);
  const completedSessions = sessions.filter((s) => s.completedAt !== null);

  const endingCounts = completedSessions.reduce<Record<string, number>>((acc, s) => {
    const key = s.endingReached ?? 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const scoreDistribution = [
    { label: '0 – 25',  count: sessions.filter((s) => (s.totalScore ?? 0) <= 25).length },
    { label: '26 – 50', count: sessions.filter((s) => (s.totalScore ?? 0) > 25 && (s.totalScore ?? 0) <= 50).length },
    { label: '51 – 75', count: sessions.filter((s) => (s.totalScore ?? 0) > 50 && (s.totalScore ?? 0) <= 75).length },
    { label: '76 – 100',count: sessions.filter((s) => (s.totalScore ?? 0) > 75).length },
  ];
  const maxDistCount = Math.max(...scoreDistribution.map((b) => b.count), 1);

  const categoryAverages = CATEGORY_CONFIG.map(({ key, label, color }) => {
    const vals = sessions.map((s) => s.phaseScores?.[key] ?? 0).filter((v) => v > 0);
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { key, label, color, avg };
  });

  const tickerPlayers = activeSessions
    .map((s) => s.playerHandle ?? 'Anonymous')
    .filter(Boolean);

  // ---------- Auth guard ----------

  if (authLoading) {
    return (
      <div
        data-theme="breach"
        style={{
          minHeight: '100vh',
          background: 'var(--bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"JetBrains Mono", monospace',
          color: 'var(--accent)',
        }}
      >
        <span style={{ animation: 'blink-cursor 1s step-end infinite' }}>Authenticating...</span>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div
        data-theme="breach"
        style={{
          minHeight: '100vh',
          background: 'var(--bg-primary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          fontFamily: '"JetBrains Mono", monospace',
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ color: 'var(--danger)', fontSize: 18, fontWeight: 700 }}>ACCESS DENIED</span>
        <span style={{ fontSize: 13 }}>Trainer login required to view this display.</span>
        <Link
          href="/trainer"
          style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'none', border: '1px solid var(--border)', padding: '6px 16px', borderRadius: 4 }}
        >
          Go to Login
        </Link>
      </div>
    );
  }

  // ---------- Render ----------

  const topTen = leaderboard.slice(0, 10);

  return (
    <div
      data-theme="breach"
      className="scanlines"
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"JetBrains Mono", monospace',
        color: 'var(--text-primary)',
        position: 'relative',
      }}
    >
      {/* ── Subtle grid overlay ── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0,229,51,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,229,51,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ════════════════════ HEADER ════════════════════ */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          background: '#030508',
          borderBottom: '1px solid var(--border)',
          padding: '0 28px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        {/* Left: back + team identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href={`/trainer/dashboard/teams/${id}`}
            style={{
              color: 'var(--text-muted)',
              fontSize: 12,
              textDecoration: 'none',
              letterSpacing: '0.05em',
              opacity: 0.6,
            }}
          >
            &larr; Dashboard
          </Link>
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          {team?.logoUrl && (
            <div style={{ position: 'relative', height: 36, width: 36 }}>
              <Image
                src={team.logoUrl}
                alt=""
                fill
                style={{ objectFit: 'contain', borderRadius: 4 }}
              />
            </div>
          )}
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.02em',
              textShadow: 'var(--glow-green)',
            }}
          >
            {team?.name ?? ''}
          </span>
        </div>

        {/* Center: LIVE badge + player count */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Pulsing red dot */}
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#ff2d55',
                display: 'inline-block',
                boxShadow: '0 0 8px #ff2d55',
                animation: 'pulse-glow 1.5s ease-in-out infinite',
              }}
            />
            <span style={{ color: '#ff2d55', fontWeight: 700, fontSize: 15, letterSpacing: '0.15em' }}>LIVE</span>
            <span
              style={{
                fontSize: 10,
                letterSpacing: '0.08em',
                color: sseStatus === 'connected' ? 'var(--success)' : sseStatus === 'reconnecting' ? 'var(--warning)' : 'var(--text-muted)',
                border: `1px solid ${sseStatus === 'connected' ? 'rgba(0,229,51,0.3)' : sseStatus === 'reconnecting' ? 'rgba(255,184,0,0.3)' : 'rgba(74,85,104,0.3)'}`,
                padding: '1px 6px',
                borderRadius: 3,
              }}
            >
              {sseStatus === 'connected' ? 'CONNECTED' : sseStatus === 'reconnecting' ? 'RECONNECTING...' : 'CONNECTING...'}
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            {activeSessions.length} player{activeSessions.length !== 1 ? 's' : ''} active
            {completedSessions.length > 0 && ` · ${completedSessions.length} completed`}
          </span>
        </div>

        {/* Right: invite code + clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {team?.inviteCode && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Invite Code
              </span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: '0.25em',
                  color: 'var(--accent)',
                  textShadow: 'var(--glow-green)',
                  background: 'rgba(0,229,51,0.06)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 6,
                  padding: '2px 12px',
                }}
              >
                {team.inviteCode}
              </span>
            </div>
          )}
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.08em',
              minWidth: 90,
              textAlign: 'right',
            }}
          >
            {clock}
          </div>
          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: isFullscreen ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            {isFullscreen ? '⊠' : '⛶'}
          </button>
        </div>
      </header>

      {/* ════════════════════ BODY ════════════════════ */}
      <div
        style={{
          position: 'relative',
          zIndex: 5,
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          gap: 1,
          minHeight: 0,
        }}
      >
        {/* ── LEFT: Leaderboard ── */}
        <section
          style={{
            width: '55%',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 24px 12px 24px',
            borderRight: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          <h2
            style={{
              margin: '0 0 16px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
            }}
          >
            &gt; Leaderboard
          </h2>

          {topTen.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13, letterSpacing: '0.08em' }}>
                Waiting for players...
              </span>
            </div>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                overflowY: 'auto',
                flex: 1,
              }}
            >
              <AnimatePresence mode="popLayout">
                {topTen.map((entry, i) => {
                  const rankColor = RANK_COLORS[i];
                  const isFlashed = flashedHandles.has(entry.playerHandle);
                  // Derive phase from the leaderboard entry's own phaseScores
                  const sessionLike = { phaseScores: entry.phaseScores ?? {} } as SessionRow;

                  return (
                    <motion.li
                      key={entry.playerHandle}
                      layout
                      initial={{ opacity: 0, y: -12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      style={{
                        background: isFlashed
                          ? 'rgba(0,229,51,0.10)'
                          : i === 0
                          ? 'rgba(255,215,0,0.04)'
                          : 'var(--bg-secondary)',
                        border: `1px solid ${rankColor ? rankColor + '40' : 'var(--border)'}`,
                        borderLeft: `3px solid ${rankColor ?? 'var(--border)'}`,
                        borderRadius: 6,
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        transition: 'background 0.4s ease',
                      }}
                    >
                      {/* Rank */}
                      <span
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: rankColor ?? 'var(--text-muted)',
                          minWidth: 36,
                          textAlign: 'center',
                          lineHeight: 1,
                          opacity: rankColor ? 1 : 0.5,
                        }}
                      >
                        #{i + 1}
                      </span>

                      {/* Handle + score bar + phase */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {entry.playerHandle}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            {entry.endingReached ? (
                              <EndingBadge ending={entry.endingReached} />
                            ) : (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: 'var(--text-muted)',
                                  letterSpacing: '0.06em',
                                  border: '1px solid var(--border)',
                                  padding: '1px 7px',
                                  borderRadius: 3,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {derivePhase(sessionLike)}
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: 20,
                                fontWeight: 700,
                                color: isFlashed ? 'var(--accent)' : 'var(--text-primary)',
                                minWidth: 40,
                                textAlign: 'right',
                                transition: 'color 0.4s',
                              }}
                            >
                              {entry.totalScore}
                            </span>
                          </div>
                        </div>
                        <ScoreBar score={entry.totalScore} max={100} color={rankColor ?? 'var(--accent)'} />
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </section>

        {/* ── RIGHT: Stats panel ── */}
        <section
          style={{
            width: '45%',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            overflow: 'hidden',
          }}
        >
          {/* 1. Score distribution */}
          <div
            style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            <h2
              style={{
                margin: '0 0 14px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
              }}
            >
              &gt; Score Distribution
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scoreDistribution.map((bucket, i) => {
                const pct = (bucket.count / maxDistCount) * 100;
                const hue = ['var(--danger)', 'var(--warning)', 'var(--info)', 'var(--success)'][i];
                return (
                  <div key={bucket.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ minWidth: 60, fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                      {bucket.label}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 14,
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        style={{
                          height: '100%',
                          background: hue,
                          opacity: 0.75,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        minWidth: 24,
                        fontSize: 13,
                        fontWeight: 700,
                        color: bucket.count > 0 ? hue : 'var(--text-muted)',
                        textAlign: 'right',
                      }}
                    >
                      {bucket.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Category averages */}
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            <h2
              style={{
                margin: '0 0 14px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
              }}
            >
              &gt; Category Averages
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {categoryAverages.map(({ key, label, color, avg }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${color}`,
                    }}
                  />
                  <span style={{ minWidth: 130, fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>
                    {label}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(avg / 25) * 100}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{
                        height: '100%',
                        background: color,
                        borderRadius: 3,
                        boxShadow: `0 0 6px ${color}`,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      minWidth: 36,
                      textAlign: 'right',
                      fontSize: 13,
                      fontWeight: 700,
                      color,
                    }}
                  >
                    {avg.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Completion status */}
          <div style={{ padding: '16px 24px', flex: 1, overflow: 'hidden' }}>
            <h2
              style={{
                margin: '0 0 14px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
              }}
            >
              &gt; Completion Status
            </h2>

            {/* Top-level counts */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Total', value: sessions.length, color: 'var(--text-secondary)', border: 'var(--border)' },
                { label: 'Active', value: activeSessions.length, color: 'var(--warning)', border: 'rgba(255,184,0,0.3)' },
                { label: 'Done', value: completedSessions.length, color: 'var(--success)', border: 'rgba(0,229,51,0.3)' },
              ].map(({ label, value, color, border }) => (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${border}`,
                    borderRadius: 6,
                    padding: '10px 12px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: 3 }}>
                    {label.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>

            {/* Endings breakdown */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(['promoted', 'lateral', 'neutral', 'fired'] as const).map((ending) => {
                const count = endingCounts[ending] ?? 0;
                const s = ENDING_STYLES[ending];
                return (
                  <div
                    key={ending}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: s.bg,
                      border: `1px solid ${s.color}30`,
                      borderRadius: 6,
                      padding: '6px 14px',
                      flex: '1 1 calc(50% - 4px)',
                    }}
                  >
                    <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{count}</span>
                    <span style={{ fontSize: 10, letterSpacing: '0.1em', color: s.color, opacity: 0.8 }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* ════════════════════ TICKER ════════════════════ */}
      {tickerPlayers.length > 0 && (
        <footer
          style={{
            position: 'relative',
            zIndex: 10,
            height: 36,
            background: '#030508',
            borderTop: '1px solid var(--border)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {/* Static label */}
          <div
            style={{
              flexShrink: 0,
              background: 'var(--accent)',
              color: '#000',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              padding: '0 12px',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              zIndex: 1,
            }}
          >
            ACTIVE
          </div>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0,
                whiteSpace: 'nowrap',
                animation: `ticker-scroll ${Math.max(20, tickerPlayers.length * 4)}s linear infinite`,
              }}
            >
              {/* Duplicate for seamless loop */}
              {[...tickerPlayers, ...tickerPlayers].map((handle, i) => (
                <span key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '0 6px' }}>
                  <span style={{ color: 'var(--accent)', marginRight: 6 }}>&#9679;</span>
                  {handle}
                  <span style={{ color: 'var(--border-strong)', margin: '0 16px' }}>&#xB7;&#xB7;&#xB7;</span>
                </span>
              ))}
            </div>
          </div>
        </footer>
      )}

      {/* ════════════════════ KEYFRAMES (inline) ════════════════════ */}
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.75); }
        }

        /* Override body overflow for this page */
        body { overflow: hidden !important; }
      `}</style>
    </div>
  );
}
