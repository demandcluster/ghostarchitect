'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminAuthProvider, useAdminAuth } from './AdminAuthProvider';

// ---------------------------------------------------------------------------
// Inner login form — uses AdminAuthProvider context
// ---------------------------------------------------------------------------

function LoginForm() {
  const { login, accessToken, isLoading } = useAdminAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [initFlash, setInitFlash] = useState('');

  // Attempt to seed admin from env vars on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/auth/init', { method: 'POST' });
        if (res.status === 201) {
          const body = await res.json().catch(() => ({}));
          if ((body as { ok?: boolean }).ok) {
            setInitFlash('Admin account initialized from environment.');
            setTimeout(() => setInitFlash(''), 4000);
          }
        }
        // If { exists: true } or any other response, silently ignore
      } catch {
        // silently ignore
      }
    })();
  }, []);

  // If already authenticated, redirect
  useEffect(() => {
    if (!isLoading && accessToken) {
      router.replace('/admin/dashboard');
    }
  }, [isLoading, accessToken, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div
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
        <span>Authenticating...</span>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"JetBrains Mono", monospace',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Grid overlay */}
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
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: 400,
          margin: '0 24px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.3em',
              color: 'var(--text-muted)',
              marginBottom: 8,
              textTransform: 'uppercase',
            }}
          >
            Ghost Architect
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '0.08em',
              textShadow: 'var(--glow-green)',
            }}
          >
            ADMIN CONSOLE
          </div>
        </div>

        {/* Init flash */}
        <AnimatePresence>
          {initFlash && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                marginBottom: 16,
                background: 'rgba(0,229,51,0.08)',
                border: '1px solid var(--border-strong)',
                borderRadius: 6,
                padding: '10px 14px',
                fontSize: 12,
                color: 'var(--accent)',
                letterSpacing: '0.03em',
              }}
            >
              {initFlash}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login card */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '28px 28px 24px',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                htmlFor="admin-username"
                style={{
                  display: 'block',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                }}
              >
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                style={{
                  width: '100%',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  padding: '10px 12px',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
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
              <label
                htmlFor="admin-password"
                style={{
                  display: 'block',
                  fontSize: 10,
                  letterSpacing: '0.15em',
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                }}
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{
                  width: '100%',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  padding: '10px 12px',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
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
                    letterSpacing: '0.03em',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 4,
                background: submitting ? 'rgba(0,229,51,0.12)' : 'rgba(0,229,51,0.15)',
                border: '1px solid var(--border-strong)',
                borderRadius: 4,
                padding: '11px 0',
                fontSize: 12,
                fontFamily: 'inherit',
                fontWeight: 700,
                letterSpacing: '0.18em',
                color: submitting ? 'var(--text-muted)' : 'var(--accent)',
                cursor: submitting ? 'not-allowed' : 'pointer',
                textShadow: submitting ? 'none' : 'var(--glow-green)',
                transition: 'all 0.15s ease',
              }}
            >
              {submitting ? 'AUTHENTICATING...' : 'ADMIN LOGIN'}
            </button>
          </form>
        </div>

        <div
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 10,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
          }}
        >
          RESTRICTED ACCESS — AUTHORIZED PERSONNEL ONLY
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page — wraps in provider
// ---------------------------------------------------------------------------

export default function AdminLoginPage() {
  return (
    <AdminAuthProvider>
      <LoginForm />
    </AdminAuthProvider>
  );
}
