"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContentLoadingScreenProps {
  progress: {
    current: string;
    total: number;
  };
  retryState?: {
    attempt: number;
    max: number;
  };
  onCancel: () => void;
}

const STEPS = [
  'Pre-breach emails',
  'Breach phishing emails',
  'Log entries',
  'Social engineering DMs',
  'LOLBins',
  'NPC advice',
  'WiFi networks',
] as const;

export function ContentLoadingScreen({ progress, retryState, onCancel }: ContentLoadingScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const currentIndex = STEPS.indexOf(progress.current);
    if (currentIndex !== -1) {
      setStepIndex(currentIndex);
    }
  }, [progress.current]);

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
          Generating Scenario Content...
        </h2>

        <div className="space-y-2">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <span className="w-6 text-center">{getStatusIcon(step, idx)}</span>
              <span className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {step}: {idx === stepIndex ? (
                  <span>
                    {progress.total}/{7}
                    {retryState && (
                      <span className="ml-2" style={{ color: 'var(--warning)' }}>
                        - Retrying ({retryState.attempt}/{retryState.max})...
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted">
                    {idx < stepIndex ? `${progress.total}/7` : '0/7'}
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
