import { describe, it, expect, beforeEach } from 'vitest';
import { useContentStore } from './contentStore';
import type { Email, LogEntry, LOLBin, WiFiNetwork } from '@/content/types';

describe('contentStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useContentStore.getState().clearSession();
  });

  it('persists content to localStorage', () => {
    const store = useContentStore.getState();
    store.setSessionId('test-session');
    store.setBreachEmails([{ id: '1', from: 'a@test.com', to: 'b@test.com', subject: 'Test', date: '2026-03-10', body: 'Test', headers: { returnPath: 'a@test.com', spf: 'pass', dkim: 'pass', dmarc: 'pass' }, isPhishing: false, indicators: [], difficulty: 'easy' }]);

    // Persist to localStorage
    store.persistToStorage();

    // Verify localStorage has the data
    const storedData = localStorage.getItem('ghost-architect-content');
    expect(storedData).not.toBeNull();
    const parsed = JSON.parse(storedData!);
    expect(parsed.sessionId).toBe('test-session');
    expect(parsed.breachEmails).toHaveLength(1);
  });

  it('restores content from localStorage', () => {
    // Pre-populate localStorage
    const testData = {
      sessionId: 'test-session',
      preBreachEmails: [],
      breachEmails: [{ id: '1', from: 'a@test.com', to: 'b@test.com', subject: 'Test', date: '2026-03-10', body: 'Test', headers: { returnPath: 'a@test.com', spf: 'pass', dkim: 'pass', dmarc: 'pass' }, isPhishing: false, indicators: [], difficulty: 'easy' }],
      logEntries: [],
      lolbins: [],
      wifi: [],
      generatedAt: null,
      isOfflineContent: false
    };
    localStorage.setItem('ghost-architect-content', JSON.stringify(testData));

    // Restore from localStorage
    useContentStore.getState().restoreFromStorage();

    const restored = useContentStore.getState();
    expect(restored.sessionId).toBe('test-session');
    expect(restored.breachEmails).toHaveLength(1);
  });

  it('isContentReady returns false when missing content', () => {
    const store = useContentStore.getState();
    store.setPreBreachEmails([{} as Email]);
    store.setLogEntries([{} as LogEntry]);

    expect(store.isContentReady()).toBe(false);
  });

  it('isContentReady returns true when all content generated', () => {
    const store = useContentStore.getState();
    store.setPreBreachEmails([{} as Email, {} as Email]);
    store.setBreachEmails([{} as Email, {} as Email]);

    expect(store.isContentReady()).toBe(true);
  });

  it('clearSession removes all content', () => {
    const store = useContentStore.getState();
    store.setSessionId('test-session');
    store.setPreBreachEmails([{} as Email]);
    store.persistToStorage();

    store.clearSession();

    const cleared = useContentStore.getState();
    expect(cleared.sessionId).toBeNull();
    expect(cleared.preBreachEmails).toHaveLength(0);
    expect(localStorage.getItem('ghost-architect-content')).toBeNull();
  });

  it('setIsOfflineContent updates offline flag', () => {
    const store = useContentStore.getState();
    expect(store.isOfflineContent).toBe(false);

    store.setIsOfflineContent(true);
    expect(useContentStore.getState().isOfflineContent).toBe(true);
  });
});
