'use client';

import { useEffect, useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthProvider';

interface Team {
  id: string;
  name: string;
  inviteCode: string;
  fakeDomain: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { sessions: number };
}

export default function DashboardPage() {
  const { authFetch, isLoading: authLoading } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create team form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [creating, setCreating] = useState(false);

  // Clipboard feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await authFetch('/api/v1/teams');
      if (res.ok) {
        setTeams(await res.json());
      } else {
        setError('Failed to load teams');
      }
    } catch {
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (!authLoading) fetchTeams();
  }, [authLoading, fetchTeams]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await authFetch('/api/v1/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, fakeDomain: newDomain || undefined }),
      });
      if (res.ok) {
        setNewName('');
        setNewDomain('');
        setShowCreate(false);
        await fetchTeams();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Failed to create team');
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleReactivate(id: string) {
    const res = await authFetch(`/api/v1/teams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true }),
    });
    if (res.ok) fetchTeams();
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Deactivate this team? Players will no longer be able to join.')) return;
    const res = await authFetch(`/api/v1/teams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    });
    if (res.ok) fetchTeams();
  }

  function copyCode(code: string, teamId: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(teamId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Teams</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showCreate ? 'Cancel' : 'Create Team'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-medium text-gray-900">New Team</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Company Name <span className="text-gray-400 font-normal">(shown in game)</span>
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Acme Corp"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Fake Domain <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="acmecorp.com"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      )}

      {teams.length === 0 ? (
        <p className="py-12 text-center text-gray-400">
          No teams yet. Create one to get started.
        </p>
      ) : (
        <div className="grid gap-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className={`rounded-lg border bg-white p-5 shadow-sm ${
                team.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-gray-900">{team.name}</h3>
                    {!team.isActive && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                    <span>
                      Code:{' '}
                      <span className="font-mono font-bold text-gray-900">{team.inviteCode}</span>
                      <button
                        onClick={() => copyCode(team.inviteCode, team.id)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                        title="Copy invite code"
                      >
                        {copiedId === team.id ? 'Copied!' : 'Copy'}
                      </button>
                    </span>
                    {team.fakeDomain && <span>Domain: {team.fakeDomain}</span>}
                    <span>Created: {new Date(team.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/trainer/dashboard/teams/${team.id}`}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View Details
                  </Link>
                  {team.isActive ? (
                    <button
                      onClick={() => handleDeactivate(team.id)}
                      className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(team.id)}
                      className="rounded-md border border-green-200 bg-white px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
