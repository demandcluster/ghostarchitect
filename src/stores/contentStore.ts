import { create } from 'zustand';
import type { Email, LogEntry, LOLBin, WiFiNetwork, IOCIndicator } from '@/content/types';

export interface ContentStoreState {
  // Generated content
  preBreachEmails: Email[];
  breachEmails: Email[];
  logEntries: LogEntry[];
  lolbins: LOLBin[];
  wifi: WiFiNetwork[];
  expectedIOCs: IOCIndicator[];

  // Session metadata
  sessionId: string | null;
  generatedAt: string | null;
  isOfflineContent: boolean;
}

interface ContentStore extends ContentStoreState {
  // Setters
  setSessionId(id: string): void;
  setPreBreachEmails(emails: Email[]): void;
  setBreachEmails(emails: Email[]): void;
  setLogEntries(logs: LogEntry[]): void;
  setLOLBins(bins: LOLBin[]): void;
  setWiFi(networks: WiFiNetwork[]): void;
  setExpectedIOCs(iocs: IOCIndicator[]): void;
  setIsOfflineContent(isOffline: boolean): void;

  // Check if content is ready
  isContentReady(): boolean;

  // Persist and restore
  persistToStorage(): void;
  restoreFromStorage(): void;
  clearSession(): void;
}

const LOCAL_STORAGE_KEY = 'ghost-architect-content';

export const useContentStore = create<ContentStore>((set, get) => ({
  preBreachEmails: [],
  breachEmails: [],
  logEntries: [],
  lolbins: [],
  wifi: [],
  expectedIOCs: [],
  sessionId: null,
  generatedAt: null,
  isOfflineContent: false,

  setSessionId: (id) => {
    set({ sessionId: id });
  },

  setPreBreachEmails: (emails) => set({ preBreachEmails: emails }),
  setBreachEmails: (emails) => set({ breachEmails: emails }),
  setLogEntries: (logs) => set({ logEntries: logs }),
  setLOLBins: (bins) => set({ lolbins: bins }),
  setWiFi: (networks) => set({ wifi: networks }),
  setExpectedIOCs: (iocs) => set({ expectedIOCs: iocs }),

  setIsOfflineContent: (isOffline) => set({ isOfflineContent: isOffline }),

  isContentReady: () => {
    const state = get();
    return (
      state.preBreachEmails.length > 0 &&
      state.breachEmails.length > 0
    );
  },

  persistToStorage: () => {
    const state = get();
    const data = {
      sessionId: state.sessionId,
      preBreachEmails: state.preBreachEmails,
      breachEmails: state.breachEmails,
      logEntries: state.logEntries,
      lolbins: state.lolbins,
      wifi: state.wifi,
      expectedIOCs: state.expectedIOCs,
      generatedAt: state.generatedAt,
      isOfflineContent: state.isOfflineContent,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  },

  restoreFromStorage: () => {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      set({
        sessionId: data.sessionId,
        preBreachEmails: data.preBreachEmails || [],
        breachEmails: data.breachEmails || [],
        logEntries: data.logEntries || [],
        lolbins: data.lolbins || [],
        wifi: data.wifi || [],
        expectedIOCs: data.expectedIOCs || [],
        generatedAt: data.generatedAt,
        isOfflineContent: data.isOfflineContent || false,
      });
    }
  },

  clearSession: () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    set({
      preBreachEmails: [],
      breachEmails: [],
      logEntries: [],
      lolbins: [],
      wifi: [],
      expectedIOCs: [],
      sessionId: null,
      generatedAt: null,
      isOfflineContent: false,
    });
  },
}));
