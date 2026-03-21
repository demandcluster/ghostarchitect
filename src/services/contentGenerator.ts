import type { Email, LogEntry, DMMessage, LOLBin, WiFiNetwork, EmailHeader } from '@/content/types';
import type { GeminiAIClient } from '@/lib/geminiAI';
import { createGeminiAIClient } from '@/lib/geminiAI';

export interface GeneratedContent {
  preBreachEmails: Email[];
  breachEmails: Email[];
  logEntries: LogEntry[];
  socialEngineeringDMs: DMMessage[];
  npcBadAdvice: DMMessage[];
  lolbins: LOLBin[];
  wifi: WiFiNetwork[];
  expectedIOCs: any[];
  sessionId: string;
  isOfflineContent: boolean;
}

export interface GenerationConfig {
  locale: string;
  sessionId: string;
  temperature?: number;
  section?: 'initial' | 'secondary' | 'all';
  teamName?: string;
  fakeDomain?: string;
  playerHandle?: string;
}

export interface IContentGenerator {
  generateAll(config: GenerationConfig): Promise<GeneratedContent>;
}

export class ContentGenerator implements IContentGenerator {
  constructor(private geminiClient: GeminiAIClient | null = null) {}

  async generateAll(config: GenerationConfig): Promise<GeneratedContent> {
    const temperature = config.temperature ?? 0.9;

    console.log('[Content Generation] Server-side generation triggered');

    // Server-side generation: API key is handled in server API route
    // Client just waits for server response
    console.log('[Content Generation] Waiting for API response from server');

    try {
      const response = await fetch('/api/v1/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: config.sessionId,
          locale: config.locale,
          temperature: temperature,
          section: config.section,
          teamName: config.teamName,
          fakeDomain: config.fakeDomain,
          playerHandle: config.playerHandle,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Content Generation] API error:', error);

        // Handle various error types
        if (response.status === 429) {
          throw new Error(error.message || 'Rate limit exceeded');
        } else if (response.status >= 500) {
          throw new Error(error.message || 'Network error');
        }

        return response.json();
      }

      console.log('[Content Generation] Server response received');
      return response.json();
    } catch (error) {
      console.error('[Content Generation] Fetch error:', error);

      // All errors trigger offline mode
      throw error;
    }
  }
}

export function createContentGenerator(): IContentGenerator | null {
  return new ContentGenerator(null);
}
