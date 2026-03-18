'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminAuthProvider, useAdminAuth } from '../AdminAuthProvider';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrainerRow {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  acceptedTermsAt: string | null;
  teamCount: number;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// ---------------------------------------------------------------------------
// Shared style helpers
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '10px 12px',
  fontSize: 13,
  fontFamily: '"JetBrains Mono", monospace',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  letterSpacing: '0.15em',
  color: 'var(--text-muted)',
  marginBottom: 6,
  textTransform: 'uppercase' as const,
};

const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? 'rgba(0,229,51,0.06)' : 'rgba(0,229,51,0.15)',
  border: '1px solid var(--border-strong)',
  borderRadius: 4,
  padding: '10px 0',
  fontSize: 11,
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 700,
  letterSpacing: '0.18em',
  color: disabled ? 'var(--text-muted)' : 'var(--accent)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  width: '100%',
  textShadow: disabled ? 'none' : 'var(--glow-green)',
  transition: 'all 0.15s ease',
});

const dangerBtnStyle = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? 'rgba(255,45,85,0.04)' : 'rgba(255,45,85,0.12)',
  border: '1px solid rgba(255,45,85,0.4)',
  borderRadius: 4,
  padding: '10px 0',
  fontSize: 11,
  fontFamily: '"JetBrains Mono", monospace',
  fontWeight: 700,
  letterSpacing: '0.18em',
  color: disabled ? 'rgba(255,45,85,0.35)' : 'var(--danger)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  width: '100%',
  transition: 'all 0.15s ease',
});

// ---------------------------------------------------------------------------
// Modal backdrop
// ---------------------------------------------------------------------------

function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '28px 28px 24px',
          width: '100%',
          maxWidth: 400,
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Create trainer modal
// ---------------------------------------------------------------------------

function CreateTrainerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { authFetch } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await authFetch('/api/admin/trainers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Failed to create trainer');
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trainer');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: 4 }}>
          ADMIN CONSOLE
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em' }}>
          NEW TRAINER ACCOUNT
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="new-trainer-username" style={labelStyle}>Username</label>
          <input
            id="new-trainer-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            autoComplete="off"
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-ring)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <div>
          <label htmlFor="new-trainer-password" style={labelStyle}>Password</label>
          <input
            id="new-trainer-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-ring)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(255,45,85,0.08)',
                border: '1px solid var(--border-red)',
                borderRadius: 4,
                padding: '8px 12px',
                fontSize: 12,
                color: 'var(--danger)',
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '10px 0',
              fontSize: 11,
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{ ...primaryBtnStyle(submitting), flex: 1 }}
          >
            {submitting ? 'CREATING...' : 'CREATE TRAINER'}
          </button>
        </div>
      </form>
    </ModalBackdrop>
  );
}

// ---------------------------------------------------------------------------
// Reset password modal
// ---------------------------------------------------------------------------

function ResetPasswordModal({
  trainer,
  onClose,
  onSuccess,
}: {
  trainer: TrainerRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { authFetch } = useAdminAuth();
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/admin/trainers/${trainer.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Failed to reset password');
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: 4 }}>
          RESET PASSWORD
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em' }}>
          {trainer.username}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="reset-new-password" style={labelStyle}>New Password</label>
          <input
            id="reset-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            autoFocus
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-ring)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, letterSpacing: '0.03em' }}>
            Minimum 8 characters
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(255,45,85,0.08)',
                border: '1px solid var(--border-red)',
                borderRadius: 4,
                padding: '8px 12px',
                fontSize: 12,
                color: 'var(--danger)',
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '10px 0',
              fontSize: 11,
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={submitting || newPassword.length < 8}
            style={{ ...primaryBtnStyle(submitting || newPassword.length < 8), flex: 1 }}
          >
            {submitting ? 'RESETTING...' : 'RESET PASSWORD'}
          </button>
        </div>
      </form>
    </ModalBackdrop>
  );
}

// ---------------------------------------------------------------------------
// Delete trainer modal
// ---------------------------------------------------------------------------

function DeleteTrainerModal({
  trainer,
  onClose,
  onDeleted,
}: {
  trainer: TrainerRow;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { authFetch } = useAdminAuth();
  const [confirmInput, setConfirmInput] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const confirmed = confirmInput === trainer.username;

  async function handleDelete(e: FormEvent) {
    e.preventDefault();
    if (!confirmed) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/admin/trainers/${trainer.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Failed to delete trainer');
      }
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trainer');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.2em', color: 'var(--danger)', marginBottom: 4 }}>
          DESTRUCTIVE ACTION
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.06em' }}>
          DELETE TRAINER
        </div>
      </div>

      <div
        style={{
          background: 'rgba(255,45,85,0.06)',
          border: '1px solid rgba(255,45,85,0.25)',
          borderRadius: 6,
          padding: '10px 14px',
          fontSize: 12,
          color: 'var(--text-secondary)',
          marginBottom: 20,
          lineHeight: 1.6,
          letterSpacing: '0.02em',
        }}
      >
        This will permanently delete{' '}
        <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{trainer.username}</span>
        {' '}and all associated data. This action cannot be undone.
      </div>

      <form onSubmit={handleDelete} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="delete-confirm" style={labelStyle}>
            Type <span style={{ color: 'var(--danger)' }}>{trainer.username}</span> to confirm
          </label>
          <input
            id="delete-confirm"
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            autoFocus
            autoComplete="off"
            placeholder={trainer.username}
            style={{
              ...inputStyle,
              borderColor: confirmInput && !confirmed ? 'rgba(255,45,85,0.5)' : 'var(--border)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-ring)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = confirmInput && !confirmed ? 'rgba(255,45,85,0.5)' : 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(255,45,85,0.08)',
                border: '1px solid var(--border-red)',
                borderRadius: 4,
                padding: '8px 12px',
                fontSize: 12,
                color: 'var(--danger)',
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '10px 0',
              fontSize: 11,
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={!confirmed || submitting}
            style={{ ...dangerBtnStyle(!confirmed || submitting), flex: 1 }}
          >
            {submitting ? 'DELETING...' : 'DELETE TRAINER'}
          </button>
        </div>
      </form>
    </ModalBackdrop>
  );
}

// ---------------------------------------------------------------------------
// Toast system
// ---------------------------------------------------------------------------

let toastCounter = 0;

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 32, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 32, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              background: toast.type === 'success' ? 'rgba(0,229,51,0.12)' : 'rgba(255,45,85,0.12)',
              border: `1px solid ${toast.type === 'success' ? 'var(--border-strong)' : 'rgba(255,45,85,0.4)'}`,
              borderRadius: 6,
              padding: '10px 16px',
              fontSize: 12,
              fontFamily: '"JetBrains Mono", monospace',
              color: toast.type === 'success' ? 'var(--accent)' : 'var(--danger)',
              letterSpacing: '0.05em',
              pointerEvents: 'auto',
              cursor: 'pointer',
              maxWidth: 320,
              boxShadow: toast.type === 'success' ? '0 0 16px rgba(0,229,51,0.15)' : '0 0 16px rgba(255,45,85,0.15)',
            }}
            onClick={() => onDismiss(toast.id)}
          >
            <span style={{ marginRight: 8 }}>{toast.type === 'success' ? '✓' : '✗'}</span>
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Content Pool Panel
// ---------------------------------------------------------------------------

function ContentPoolPanel({ authFetch }: { authFetch: (url: string, options?: RequestInit) => Promise<Response> }) {
  const [data, setData] = useState<{ counts: { type: string; count: number }[]; summary: { total: number; audited: number; pending: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/content');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchCounts]);

  const triggerRefill = async (section: string) => {
    setActionLoading(section);
    try {
      await authFetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section })
      });
      // Give it a moment then refresh
      setTimeout(fetchCounts, 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !data) return null;

  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={labelStyle}>System Health</div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          AI Content Pool
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {/* Summary Card */}
        <div style={{ 
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border)', 
          borderRadius: 8, 
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={labelStyle}>Pool Status</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>
              {data?.summary.total || 0}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              {data?.summary.audited || 0} Audited / {data?.summary.pending || 0} Pending
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button
              onClick={() => triggerRefill('all')}
              disabled={!!actionLoading}
              style={{ ...primaryBtnStyle(!!actionLoading), padding: '6px 0', fontSize: 10 }}
            >
              {actionLoading === 'all' ? 'REFILLING...' : 'REFILL ALL'}
            </button>
          </div>
        </div>

        {/* Breakdown Card */}
        <div style={{ 
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border)', 
          borderRadius: 8, 
          padding: 16,
          gridColumn: 'span 2'
        }}>
          <div style={labelStyle}>Pool Breakdown</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginTop: 8 }}>
            {[
              'EMAIL_PRE', 'EMAIL_BREACH', 'DM_INTRO', 'DM_SCENARIO', 'NPC_ADVICE', 'LOG_BATCH', 'LOLBIN_BATCH', 'WIFI_BATCH'
            ].map(type => {
              const item = data?.counts.find(c => c.type === type);
              const count = item ? item.count : 0;
              return (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  <span style={{ fontSize: 11, color: count > 0 ? 'var(--text-secondary)' : 'var(--danger)' }}>
                    {type}{count === 0 ? ' (MISSING)' : ''}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: count > 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button
              onClick={() => triggerRefill('initial')}
              disabled={!!actionLoading}
              style={{ ...primaryBtnStyle(!!actionLoading), padding: '6px 0', fontSize: 10, flex: 1 }}
            >
              {actionLoading === 'initial' ? 'REFILLING...' : 'REFILL STAGE 1'}
            </button>
            <button
              onClick={() => triggerRefill('secondary')}
              disabled={!!actionLoading}
              style={{ ...primaryBtnStyle(!!actionLoading), padding: '6px 0', fontSize: 10, flex: 1 }}
            >
              {actionLoading === 'secondary' ? 'REFILLING...' : 'REFILL STAGE 2'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner dashboard — uses AdminAuthProvider context
// ---------------------------------------------------------------------------

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'reset'; trainer: TrainerRow }
  | { type: 'delete'; trainer: TrainerRow };

function AdminDashboard() {
  const { accessToken, adminUsername, logout, authFetch, isLoading } = useAdminAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'trainers' | 'pool'>('trainers');
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [loadingTrainers, setLoadingTrainers] = useState(true);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.replace('/admin');
    }
  }, [isLoading, accessToken, router]);

  // Toast helpers
  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch trainers
  const fetchTrainers = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/trainers');
      if (res.ok) {
        const data = await res.json();
        setTrainers(data.trainers);
      } else {
        addToast('Failed to load trainers', 'error');
      }
    } catch {
      addToast('Failed to load trainers', 'error');
    } finally {
      setLoadingTrainers(false);
    }
  }, [authFetch, addToast]);

  useEffect(() => {
    if (!isLoading && accessToken) {
      fetchTrainers();
    }
  }, [isLoading, accessToken, fetchTrainers]);

  // Loading / auth guard render
  if (isLoading) {
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
        Authenticating...
      </div>
    );
  }

  if (!accessToken) return null;

  // Format date helper
  function fmtDate(iso: string): string {
    return iso.slice(0, 10);
  }

  return (
    <div
      data-theme="breach"
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"JetBrains Mono", monospace',
        color: 'var(--text-primary)',
        position: 'relative',
      }}
    >
      {/* Grid overlay */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
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

      {/* ── Header ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
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
        {/* Left: wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.08em',
              textShadow: 'var(--glow-green)',
            }}
          >
            &#x2B21; GHOST ARCHITECT ADMIN
          </span>
        </div>

        {/* Right: username + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
            }}
          >
            {adminUsername}
          </span>
          <button
            onClick={() => logout()}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 11,
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--danger)';
              e.currentTarget.style.borderColor = 'rgba(255,45,85,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            LOGOUT
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          padding: '32px 32px 48px',
          maxWidth: 1100,
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('trainers')}
            style={{
              padding: '8px 4px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: activeTab === 'trainers' ? 'var(--accent)' : 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'trainers' ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            TRAINERS
          </button>
          <button
            onClick={() => setActiveTab('pool')}
            style={{
              padding: '8px 4px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: activeTab === 'pool' ? 'var(--accent)' : 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'pool' ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            SYSTEM HEALTH
          </button>
        </div>

        {activeTab === 'trainers' ? (
          <>
            {/* Panel header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '0.06em',
                  }}
                >
                  Trainer Management
                </h1>
              </div>

              <button
                onClick={() => setModal({ type: 'create' })}
                style={{
                  background: 'rgba(0,229,51,0.12)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 6,
                  padding: '9px 18px',
                  fontSize: 11,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  textShadow: 'var(--glow-green)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,229,51,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0,229,51,0.12)';
                }}
              >
                + NEW TRAINER
              </button>
            </div>

            {/* Table panel */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                overflow: 'hidden',
                marginBottom: 40,
              }}
            >
              {/* Table header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 80px 110px 90px 1fr',
                  padding: '10px 20px',
                  background: 'rgba(0,0,0,0.3)',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                <span>Username</span>
                <span>Teams</span>
                <span>Created</span>
                <span>Terms</span>
                <span style={{ textAlign: 'right' }}>Actions</span>
              </div>

              {/* Rows */}
              {loadingTrainers ? (
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: 13,
                    letterSpacing: '0.06em',
                  }}
                >
                  Loading...
                </div>
              ) : trainers.length === 0 ? (
                <div
                  style={{
                    padding: '64px 20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: 13,
                    letterSpacing: '0.06em',
                  }}
                >
                  No trainer accounts yet. Create the first one.
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {trainers.map((trainer, i) => (
                    <motion.div
                      key={trainer.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                      transition={{ duration: 0.2 }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 80px 110px 90px 1fr',
                        padding: '14px 20px',
                        borderBottom: i < trainers.length - 1 ? '1px solid var(--border)' : 'none',
                        alignItems: 'center',
                      }}
                    >
                      {/* Username */}
                      <div>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            letterSpacing: '0.03em',
                          }}
                        >
                          {trainer.username}
                        </span>
                        {trainer.role !== 'trainer' && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              background: 'rgba(77,159,255,0.15)',
                              color: '#4d9fff',
                              border: '1px solid rgba(77,159,255,0.3)',
                              borderRadius: 3,
                              padding: '1px 6px',
                              letterSpacing: '0.08em',
                            }}
                          >
                            {trainer.role.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Teams badge */}
                      <div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 28,
                            height: 22,
                            background: trainer.teamCount > 0 ? 'rgba(0,229,51,0.1)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${trainer.teamCount > 0 ? 'rgba(0,229,51,0.3)' : 'var(--border)'}`,
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 700,
                            color: trainer.teamCount > 0 ? 'var(--accent)' : 'var(--text-muted)',
                            padding: '0 8px',
                          }}
                        >
                          {trainer.teamCount}
                        </span>
                      </div>

                      {/* Created */}
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {fmtDate(trainer.createdAt)}
                      </div>

                      {/* Terms */}
                      <div>
                        {trainer.acceptedTermsAt ? (
                          <span
                            style={{
                              fontSize: 14,
                              color: '#00e533',
                              textShadow: '0 0 8px rgba(0,229,51,0.5)',
                            }}
                            title={`Accepted ${fmtDate(trainer.acceptedTermsAt)}`}
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 14,
                              color: 'var(--danger)',
                            }}
                            title="Terms not accepted"
                          >
                            ✗
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setModal({ type: 'reset', trainer })}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 4,
                            padding: '5px 12px',
                            fontSize: 10,
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--accent)';
                            e.currentTarget.style.borderColor = 'var(--border-strong)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }}
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => setModal({ type: 'delete', trainer })}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255,45,85,0.3)',
                            borderRadius: 4,
                            padding: '5px 12px',
                            fontSize: 10,
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            opacity: 0.6,
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.background = 'rgba(255,45,85,0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.6';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </>
        ) : (
          <ContentPoolPanel authFetch={authFetch} />
        )}
      </main>

      {/* ── Modals ── */}
      <AnimatePresence>
        {modal.type === 'create' && (
          <CreateTrainerModal
            onClose={() => setModal({ type: 'none' })}
            onCreated={() => {
              addToast('Trainer created', 'success');
              fetchTrainers();
            }}
          />
        )}
        {modal.type === 'reset' && (
          <ResetPasswordModal
            trainer={modal.trainer}
            onClose={() => setModal({ type: 'none' })}
            onSuccess={() => {
              addToast('Password reset', 'success');
              fetchTrainers();
            }}
          />
        )}
        {modal.type === 'delete' && (
          <DeleteTrainerModal
            trainer={modal.trainer}
            onClose={() => setModal({ type: 'none' })}
            onDeleted={() => {
              addToast('Trainer deleted', 'success');
              setTrainers((prev) => prev.filter((t) => t.id !== modal.trainer.id));
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Toasts ── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page — wraps in provider
// ---------------------------------------------------------------------------

export default function AdminDashboardPage() {
  return (
    <AdminAuthProvider>
      <AdminDashboard />
    </AdminAuthProvider>
  );
}
