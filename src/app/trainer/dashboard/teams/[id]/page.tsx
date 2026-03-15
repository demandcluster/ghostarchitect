'use client';

import { useEffect, useState, useCallback, useRef, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../AuthProvider';

interface Team {
  id: string;
  name: string;
  inviteCode: string;
  fakeDomain: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
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

interface LeaderboardEntry {
  playerHandle: string;
  totalScore: number;
  endingReached: string | null;
  completedAt: string | null;
}

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { authFetch, isLoading: authLoading } = useAuth();

  const [team, setTeam] = useState<Team | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Logo upload
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchTeam = useCallback(async () => {
    try {
      const [teamRes, sessionsRes] = await Promise.all([
        authFetch(`/api/v1/teams/${id}`),
        authFetch(`/api/v1/teams/${id}/sessions`),
      ]);
      if (teamRes.ok) {
        const t = await teamRes.json();
        setTeam(t);
        setEditName(t.name);
        setEditDomain(t.fakeDomain ?? '');
      } else {
        setError('Team not found');
      }
      if (sessionsRes.ok) {
        setSessions(await sessionsRes.json());
      }
    } catch {
      setError('Failed to load team');
    } finally {
      setLoading(false);
    }
  }, [authFetch, id]);

  useEffect(() => {
    if (!authLoading) fetchTeam();
  }, [authLoading, fetchTeam]);

  // SSE leaderboard
  useEffect(() => {
    if (!id) return;
    const es = new EventSource(`/api/v1/teams/${id}/leaderboard/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          setLeaderboard(data);
        }
      } catch { /* ignore parse errors */ }
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [id]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await authFetch(`/api/v1/teams/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, fakeDomain: editDomain || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTeam(updated);
      } else {
        setError('Failed to update team');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await authFetch(`/api/v1/teams/${id}/logo`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setTeam((prev) => (prev ? { ...prev, logoUrl: data.logoUrl } : prev));
      } else {
        const body = await res.json().catch(() => ({}));
        setError(`Upload failed (${res.status}): ${body.error ?? 'Unknown error'}`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete() {
    if (!team || deleteConfirm !== team.name) return;
    setDeleting(true);
    try {
      const res = await authFetch(`/api/v1/teams/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/trainer/dashboard');
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Failed to delete team');
        setShowDeleteModal(false);
      }
    } finally {
      setDeleting(false);
    }
  }

  function formatDuration(start: string, end: string | null): string {
    if (!end) return '--';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.round(ms / 60000);
    return `${mins}m`;
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-red-600">{error || 'Team not found'}</p>
        <Link href="/trainer/dashboard" className="mt-2 text-sm text-blue-600 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/trainer/dashboard" className="text-sm text-blue-600 hover:underline">
          &larr; Back to dashboard
        </Link>
        <Link
          href={`/trainer/dashboard/teams/${id}/live`}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-green-400 hover:bg-black transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Live Display ↗
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Team Info & Edit */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{team.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Code: <span className="font-mono font-bold text-gray-900">{team.inviteCode}</span>
              {' | '}
              Status:{' '}
              <span className={team.isActive ? 'text-green-600' : 'text-gray-400'}>
                {team.isActive ? 'Active' : 'Inactive'}
              </span>
              {team.fakeDomain && ` | Domain: ${team.fakeDomain}`}
            </p>
          </div>
          {team.logoUrl && (
            <img src={team.logoUrl} alt="Team logo" className="h-12 w-12 rounded object-contain" />
          )}
        </div>

        <form onSubmit={handleSave} className="border-t border-gray-100 pt-4">
          <h2 className="mb-3 text-sm font-medium text-gray-700">Edit Team</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500">Company Name <span className="text-gray-400">(shown in game)</span></label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500">Fake Domain</label>
              <input
                type="text"
                value={editDomain}
                onChange={(e) => setEditDomain(e.target.value)}
                placeholder="acmecorp.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>

        {/* Logo Upload */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h2 className="mb-2 text-sm font-medium text-gray-700">Team Logo</h2>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="text-sm text-gray-500 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
            />
            {uploading && <span className="text-xs text-gray-400">Uploading...</span>}
          </div>
        </div>

        {/* Danger zone */}
        <div className="mt-4 border-t border-red-100 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Delete Team</p>
              <p className="text-xs text-gray-400 mt-0.5">Permanently removes the team and all session data.</p>
            </div>
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteConfirm(''); }}
              className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete Team
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Delete Team</h2>
            <p className="text-sm text-gray-500 mb-4">
              This will permanently delete <span className="font-semibold text-gray-900">{team.name}</span> and all associated sessions. This cannot be undone.
            </p>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Type <span className="font-mono font-bold text-gray-900">{team.name}</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && deleteConfirm === team.name) handleDelete(); }}
              placeholder={team.name}
              autoFocus
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== team.name || deleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Leaderboard <span className="text-xs font-normal text-gray-400">(live)</span>
        </h2>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-gray-400">No completed sessions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-medium uppercase text-gray-400">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Player</th>
                  <th className="pb-2 pr-4">Score</th>
                  <th className="pb-2 pr-4">Ending</th>
                  <th className="pb-2">Completed</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-500">{i + 1}</td>
                    <td className="py-2 pr-4 font-medium text-gray-900">
                      {entry.playerHandle ?? 'Anonymous'}
                    </td>
                    <td className="py-2 pr-4 font-mono">{entry.totalScore ?? '--'}</td>
                    <td className="py-2 pr-4">
                      {entry.endingReached ? (
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            entry.endingReached === 'promoted'
                              ? 'bg-green-100 text-green-700'
                              : entry.endingReached === 'fired'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {entry.endingReached}
                        </span>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="py-2 text-gray-500">
                      {entry.completedAt
                        ? new Date(entry.completedAt).toLocaleString()
                        : 'In progress'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sessions Table */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">All Sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-400">No sessions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-medium uppercase text-gray-400">
                  <th className="pb-2 pr-4">Player</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Phishing</th>
                  <th className="pb-2 pr-4">Password</th>
                  <th className="pb-2 pr-4">Network</th>
                  <th className="pb-2 pr-4">Forensic</th>
                  <th className="pb-2 pr-4">Ending</th>
                  <th className="pb-2">Completed</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-900">
                      {s.playerHandle ?? 'Anonymous'}
                    </td>
                    <td className="py-2 pr-4 font-mono font-bold">
                      {s.totalScore ?? '--'}
                    </td>
                    <td className="py-2 pr-4 font-mono text-gray-600">
                      {s.phaseScores?.phishingIQ ?? '--'}
                    </td>
                    <td className="py-2 pr-4 font-mono text-gray-600">
                      {s.phaseScores?.passwordHygiene ?? '--'}
                    </td>
                    <td className="py-2 pr-4 font-mono text-gray-600">
                      {s.phaseScores?.networkSecurity ?? '--'}
                    </td>
                    <td className="py-2 pr-4 font-mono text-gray-600">
                      {s.phaseScores?.forensicSkill ?? '--'}
                    </td>
                    <td className="py-2 pr-4">
                      {s.endingReached ? (
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            s.endingReached === 'promoted'
                              ? 'bg-green-100 text-green-700'
                              : s.endingReached === 'fired'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {s.endingReached}
                        </span>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="py-2 text-gray-500">
                      {s.completedAt
                        ? new Date(s.completedAt).toLocaleString()
                        : 'In progress'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
