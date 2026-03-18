"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContentLoadingScreenProps {
  progress: {
    current: string;
    total: number;
  };
  fakeProgress: number;
  retryState?: {
    attempt: number;
    max: number;
  };
  error?: string | null;
  onCancel: () => void;
}

const STEPS = [
  'Pre-breach emails',
  'Breach phishing emails',
  'Social engineering DMs',
] as const;

const LOADING_MESSAGES = [
  "Analyzing threat patterns...",
  "Simulating attack vectors...",
  "Generating phishing emails...",
  "Building social engineering scenarios...",
  "Finalizing initial content..."
] as const;

export function ContentLoadingScreen({ progress, fakeProgress, retryState, error, onCancel }: ContentLoadingScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [currentMessage, setCurrentMessage] = useState<string>(LOADING_MESSAGES[0]);

  useEffect(() => {
    const currentIndex = STEPS.indexOf(progress.current as any);
    if (currentIndex !== -1) {
      setStepIndex(currentIndex);
    }
  }, [progress.current]);

  // Rotate loading messages
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => {
        const idx = LOADING_MESSAGES.indexOf(prev as any);
        return LOADING_MESSAGES[(idx + 1) % LOADING_MESSAGES.length];
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (step: string, idx: number) => {
    if (idx < stepIndex) return '✓';
    if (idx === stepIndex) return retryState ? '⏳' : '🔄';
    return '○';
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg-primary)', zIndex: 100 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl p-8 max-w-md w-full shadow-2xl"
        style={{ background: 'var(--bg-window)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-xl font-bold mb-4 text-center" style={{ color: 'var(--text-primary)' }}>
          Preparing Security Portal...
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded text-sm text-center" style={{
            background: 'var(--bg-window-sunken)',
            border: '1px solid var(--warning)',
            color: 'var(--warning)'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Animated loading message */}
        <div className="mb-4 p-3 rounded" style={{
          background: 'var(--bg-window-sunken)',
          border: '1px solid var(--accent)',
        }}>
          <motion.p
            key={currentMessage}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm text-center"
            style={{ color: 'var(--accent)' }}
          >
            {currentMessage}
          </motion.p>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-window-sunken)' }}>
            <motion.div
              className="h-full rounded-full transition-all duration-300"
              style={{ background: 'var(--accent)' }}
              initial={{ width: '0%' }}
              animate={{ width: `${fakeProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="text-xs text-center mt-1" style={{ color: 'var(--text-muted)' }}>
            {Math.round(fakeProgress)}% complete
          </div>
        </div>

        <div className="space-y-2">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <span className="w-6 text-center">{getStatusIcon(step, idx)}</span>
              <span className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {step}: {idx === stepIndex ? (
                  <span>
                    Loading...
                    {retryState && (
                      <span className="ml-2" style={{ color: 'var(--warning)' }}>
                        - Retrying ({retryState.attempt}/{retryState.max})...
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted">
                    {idx < stepIndex ? 'Ready' : 'Waiting...'}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="mt-6 px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{ background: 'var(--bg-window-sunken)', border: '1px solid var(--border)' }}
        >
          Use Offline Content
        </button>
      </motion.div>
    </div>
  );
}
