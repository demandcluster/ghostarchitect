import { create } from 'zustand';
import type { Email, LogEntry, DMMessage, LOLBin, WiFiNetwork, IOCIndicator } from '@/content/types';

export interface ContentStoreState {
  // Generated content
  preBreachEmails: Email[];
  breachEmails: Email[];
  logEntries: LogEntry[];
  socialEngineeringDMs: DMMessage[];
  npcBadAdvice: DMMessage[];
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
  setSocialEngineeringDMs(dms: DMMessage[]): void;
  setNPCBadAdvice(dms: DMMessage[]): void;
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
const SESSION_ID_KEY = 'ghost-architect-session-id';

export const useContentStore = create<ContentStore>((set, get) => ({
  preBreachEmails: [],
  breachEmails: [],
  logEntries: [],
  socialEngineeringDMs: [],
  npcBadAdvice: [],
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
  setSocialEngineeringDMs: (dms) => set({ socialEngineeringDMs: dms }),
  setNPCBadAdvice: (dms) => set({ npcBadAdvice: dms }),
  setLOLBins: (bins) => set({ lolbins: bins }),
  setWiFi: (networks) => set({ wifi: networks }),
  setExpectedIOCs: (iocs) => set({ expectedIOCs: iocs }),

  setIsOfflineContent: (isOffline) => set({ isOfflineContent: isOffline }),

  isContentReady: () => {
    const state = get();
    const ready = (
      state.preBreachEmails.length > 0 &&
      state.breachEmails.length > 0 &&
      state.socialEngineeringDMs.length > 0
    );
    if (!ready) {
      console.log("[ContentStore] Not ready:", 
        "pre:", state.preBreachEmails.length, 
        "breach:", state.breachEmails.length, 
        "dms:", state.socialEngineeringDMs.length
      );
    }
    return ready;
  },

  persistToStorage: () => {
    const state = get();
    const data = {
      sessionId: state.sessionId,
      preBreachEmails: state.preBreachEmails,
      breachEmails: state.breachEmails,
      logEntries: state.logEntries,
      socialEngineeringDMs: state.socialEngineeringDMs,
      npcBadAdvice: state.npcBadAdvice,
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
        socialEngineeringDMs: data.socialEngineeringDMs || [],
        npcBadAdvice: data.npcBadAdvice || [],
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
      socialEngineeringDMs: [],
      npcBadAdvice: [],
      lolbins: [],
      wifi: [],
      expectedIOCs: [],
      sessionId: null,
      generatedAt: null,
      isOfflineContent: false,
    });
  },
}));
