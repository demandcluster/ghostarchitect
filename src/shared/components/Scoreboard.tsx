"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, Reorder } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import type { LeaderboardEntry, LeaderboardSnapshot } from "@/services/gameService";

const BACKEND_ENABLED = process.env.NEXT_PUBLIC_BACKEND_ENABLED === "true";

const ENDING_ICONS: Record<string, string> = {
  promoted: "^",
  fired: "x",
  lateral: ">",
  neutral: "-",
};

export function Scoreboard() {
  const teamId = useGameStore((s) => s.teamId);
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!BACKEND_ENABLED || !teamId) return;

    let active = true;
    
    // Move state updates to next tick to avoid cascading render warning
    Promise.resolve().then(() => {
      if (active) setLoading(true);
    });

    // Fetch initial snapshot
    fetch(`/api/v1/teams/${encodeURIComponent(teamId)}/leaderboard`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: LeaderboardSnapshot) => {
        if (!active) return;
        setRankings(data.rankings);
        setTeamName(data.teamName ?? null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });

    // Subscribe to live updates
    const es = new EventSource(
      `/api/v1/teams/${encodeURIComponent(teamId)}/leaderboard/stream`
    );
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      if (!active) return;
      try {
        const data: LeaderboardSnapshot = JSON.parse(event.data);
        setRankings(data.rankings);
        if (data.teamName) setTeamName(data.teamName);
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects
    };

    return () => {
      active = false;
      es.close();
      eventSourceRef.current = null;
    };
  }, [teamId]);

  if (!BACKEND_ENABLED) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center">
        <div className="text-3xl mb-3">T</div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2">
          Leaderboard
        </h3>
        <p className="text-xs text-[var(--text-muted)] max-w-xs">
          Leaderboard is available in team mode. Ask your trainer for an invite
          code to join a team and compete on the live scoreboard.
        </p>
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="p-6 text-center">
        <p className="text-xs text-[var(--text-muted)]">
          Join a team with an invite code to see the leaderboard.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-xs text-[var(--text-muted)]">
        Loading leaderboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-xs text-danger">
        Failed to load leaderboard: {error}
      </div>
    );
  }

  const completed = rankings.filter((r) => r.completedAt);
  const inProgress = rankings.filter((r) => !r.completedAt);

  return (
    <div className="p-4 h-full overflow-auto">
      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">
        {teamName ? `${teamName} — Scoreboard` : "Team Scoreboard"}
      </h3>

      {/* Completed players */}
      {completed.length > 0 && (
        <div className="mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[var(--text-muted)] border-b border">
                <th className="text-left py-1 w-8">#</th>
                <th className="text-left py-1">Player</th>
                <th className="text-right py-1">Score</th>
                <th className="text-center py-1 w-8">End</th>
                <th className="text-right py-1">Time</th>
              </tr>
            </thead>
            <AnimatePresence>
              <Reorder.Group
                as="tbody"
                axis="y"
                values={completed}
                onReorder={() => {}}
              >
                {completed.map((entry) => (
                  <Reorder.Item
                    key={entry.playerHandle + entry.rank}
                    value={entry}
                    as="tr"
                    className="border-b border"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    dragListener={false}
                  >
                    <td className="py-2 font-bold text-accent">
                      {entry.rank}
                    </td>
                    <td className="py-2 text-[var(--text-primary)] font-medium">
                      {entry.playerHandle || "Anonymous"}
                    </td>
                    <td className="py-2 text-right font-mono text-[var(--text-primary)]">
                      {entry.totalScore}
                    </td>
                    <td className="py-2 text-center" title={entry.endingReached}>
                      {entry.endingReached
                        ? ENDING_ICONS[entry.endingReached] || "?"
                        : ""}
                    </td>
                    <td className="py-2 text-right text-[var(--text-muted)]">
                      {entry.completedAt
                        ? new Date(entry.completedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </td>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </AnimatePresence>
          </table>
        </div>
      )}

      {/* In progress players */}
      {inProgress.length > 0 && (
        <div>
          <div className="text-[10px] font-medium mb-2 uppercase tracking-wide" style={{ color: "#64748b" }}>
            In Progress
          </div>
          <div className="space-y-1">
            {inProgress.map((entry) => {
              const phases = entry.phaseScores;
              const completedPhases = Object.keys(phases).length;
              return (
                <div
                  key={entry.playerHandle + entry.rank}
                  className="flex items-center justify-between py-1.5 px-2 rounded text-xs"
                  style={{ background: "#f8fafc" }}
                >
                  <span className="font-medium" style={{ color: "#0f172a" }}>
                    {entry.playerHandle || "Anonymous"}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {["onboarding", "breach", "investigation", "debrief"].map(
                        (p) => (
                          <div
                            key={p}
                            className={`w-2 h-2 rounded-full ${
                              phases[p as keyof typeof phases] !== undefined
                                ? "bg-accent"
                                : "bg-tertiary"
                            }`}
                            title={p}
                          />
                        )
                      )}
                    </div>
                    <span className="text-[var(--text-muted)]">
                      {completedPhases}/4
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rankings.length === 0 && (
        <p className="text-xs text-[var(--text-muted)] text-center py-8">
          No players yet. Be the first to complete the simulation!
        </p>
      )}
    </div>
  );
}
