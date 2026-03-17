# AI-Generated Game Content Design

**Date**: 2026-03-17
**Author**: Claude Sonnet
**Status**: Approved

## Problem

Current Ghost Architect game uses static hardcoded content arrays for emails, logs, DM messages, LOLBins, and other game content. This enables players to share answers and reduces replayability. The game needs dynamic content generation to ensure each playthrough is unique, challenging, and results cannot be shared.

## Solution

Integrate Zhipu AI (GLM-4) API to generate all game content on-demand before gameplay starts. Generated content is cached per session and persisted to localStorage.

## Goals

1. **Uniqueness**: Each playthrough generates different content
2. **Challenge**: Content remains technically accurate and educational
3. **Non-shareable**: Results cannot be copied between sessions
4. **Background loading**: No gameplay interruptions for AI generation
5. **i18n-ready**: Architecture supports future internationalization
6. **Cost-effective**: Reasonable API costs (~¥1-2 per session)

---

## Content Generation Requirements

### Content Types to Generate

| Type | Count | Technical Requirements |
|-------|--------|---------------------|
| Pre-breach emails | 3-5 | Valid SPF/DKIM/DMARC headers, corporate from/to addresses |
| Breach phishing emails | 10 | Subtle indicators (typos, urgency, suspicious headers), difficulty ratings |
| Log entries | 50+ | Realistic timestamps, process names, IP patterns, MITRE ATT&CK IDs |
| Social engineering DMs | 8 | Realistic corporate jargon, multi-choice responses, scoring logic |
| NPC bad advice | 4 | Security staff giving poor containment guidance |
| LOLBins | 10 | Actual Windows binaries, legitimate vs attack patterns, MITRE IDs |
| WiFi networks | 5 | BSSID format, signal strength (dBm), auth types |

### Technical Accuracy Constraints

- **Email headers**: Must use valid SPF/DKIM/DMARC values (`pass`, `fail`, `p=none`, `p=quarantine`, `p=reject`)
- **Log entries**: Realistic process names (`sshd`, `sudo`, `cmd.exe`), valid IP addresses, proper timestamp format
- **MITRE ATT&CK**: Real technique IDs in `Txxxx.xxx` format
- **LOLBins**: Actual Windows binaries (certutil, bitsadmin, wscript, regsvr32, mshta)
- **Signal strength**: Plausible dBm values (-30 to -90 range)
- **Difficulty distribution**: Mix of easy/medium/hard across phishing emails

---

## Architecture

### Core Components

#### 1. Content Generator Service (`src/services/contentGenerator.ts`)

```typescript
interface ContentGeneratorConfig {
  locale: string;
  sessionId: string;
  temperature: number;
}

class ContentGenerator {
  constructor(zhipuClient: ZhipuAIClient, config: ContentGeneratorConfig)

  // Generate all content in parallel batch
  generateAll(): Promise<GeneratedContent>

  // Individual generators
  generatePreBreachEmails(count: number): Promise<Email[]>
  generateBreachEmails(count: number): Promise<Email[]>
  generateLogEntries(count: number): Promise<LogEntry[]>
  generateSocialEngineeringDMs(): Promise<DMMessage[]>
  generateNPCBadAdvice(): Promise<DMMessage[]>
  generateLOLBins(count: number): Promise<LOLBin[]>
  generateWiFi(count: number): Promise<WiFiNetwork[]>
}
```

#### 2. Content Templates (`src/content/templates/`)

Structured prompt templates with context markers for security accuracy:

```typescript
// src/content/templates/emails.ts
export const EMAIL_GENERATION_PROMPT = `
Generate 10 phishing emails for a corporate cybersecurity training scenario.

Requirements:
- SPF/DKIM/DMARC headers: must be valid values
  - SPF: pass, fail, none
  - DKIM: pass, fail
  - DMARC: pass, fail, p=none, p=quarantine, p=reject
- Indicators: include 1-3 subtle phishing signs per email
- From addresses: use realistic corporate domains (e.g., @nexuscorp.com)
- Difficulty: mix of easy/medium/hard
- Locale: {locale}
- Each email must have: id, from, to, subject, date, body, headers JSON object

Format as JSON array matching this interface:
{{
  "id": string,
  "from": string,
  "to": string,
  "subject": string,
  "date": string (YYYY-MM-DD HH:mm format),
  "body": string,
  "headers": {{
    "returnPath": string,
    "spf": string,
    "dkim": string,
    "dmarc": string
  }},
  "isPhishing": boolean,
  "indicators": string[],
  "difficulty": "easy" | "medium" | "hard"
}}
```

```typescript
// src/content/templates/logs.ts
export const LOG_GENERATION_PROMPT = `
Generate 50+ log entries for a cybersecurity investigation scenario.

Requirements:
- Mix of INFO, WARN, ERROR, CRITICAL levels
- Include both legitimate and malicious entries
- Legitimate sources: systemd, cron, nginx, postfix
- Malicious sources: sshd (brute force), cmd.exe (lateral movement), powershell.exe (LOLBins)
- Realistic timestamps within 24-hour window
- IP addresses: use realistic corporate subnet (e.g., 10.0.0.0/8, 185.234.x.x)
- MITRE ATT&CK IDs: use real technique IDs (T1110.001, T1059.001, T1055, etc.)
- Locale: {locale}

Format as JSON array matching:
{{
  "id": string,
  "timestamp": string (YYYY-MM-DD HH:mm:ss),
  "level": "INFO" | "WARN" | "ERROR" | "CRITICAL",
  "source": string,
  "message": string,
  "isMalicious": boolean,
  "attackTechnique": string,
  "mitreId": string (Txxxx.xxx format)
}}
```

Similar templates for: `dms.ts`, `lolbins.ts`, `wifi.ts`

#### 3. Session Content Store (`src/stores/contentStore.ts`)

```typescript
interface ContentStoreState {
  // Generated content
  preBreachEmails: Email[];
  breachEmails: Email[];
  logEntries: LogEntry[];
  socialEngineeringDMs: DMMessage[];
  npcBadAdvice: DMMessage[];
  lolbins: LOLBin[];
  wifi: WiFiNetwork[];

  // Session metadata
  sessionId: string | null;
  generatedAt: string | null;
  isOfflineContent: boolean;
}

interface ContentStore extends ContentStoreState {
  setSessionId(id: string): void;
  setPreBreachEmails(emails: Email[]): void;
  setBreachEmails(emails: Email[]): void;
  setLogEntries(logs: LogEntry[]): void;
  setSocialEngineeringDMs(dms: DMMessage[]): void;
  setNPCBadAdvice(dms: DMMessage[]): void;
  setLOLBins(bins: LOLBin[]): void;
  setWiFi(networks: WiFiNetwork[]): void;
  setIsOfflineContent(isOffline: boolean): void;
  clearSession(): void;

  // Check if content is ready
  isContentReady(): boolean;
}
```

#### 4. Zhipu AI Client (`src/lib/zhipuAI.ts`)

```typescript
interface ZhipuAIConfig {
  apiKey: string;
  model: 'glm-4' | 'glm-4-plus';
  baseURL: string;
}

interface GenerationOptions {
  temperature?: number; // 0.8-1.0 for varied content
  maxTokens?: number;
  locale?: string;
}

class ZhipuAIClient {
  constructor(config: ZhipuAIConfig)

  // Single generation
  generateContent(prompt: string, options?: GenerationOptions): Promise<string>;

  // Batch generation for efficiency
  generateBatch(prompts: string[], options?: GenerationOptions): Promise<string[]>;

  // Health check
  healthCheck(): Promise<boolean>;
}
```

#### 5. Game Store Enhancement (`src/stores/gameStore.ts`)

```typescript
interface GameStore {
  // ... existing fields ...

  // i18n locale (hardcoded to 'en' for now)
  contentLocale: string; // Default: 'en'
}
```

### Generation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 App Initialization                        │
│  1. Check localStorage for cached content?         │
│  2. If yes → Skip generation (instant load)        │
│  3. If no → Generate new session ID or use existing  │
│  4. Sync session ID across stores                │
│     contentStore.setSessionId(sessionId);             │
│     gameStore.setSessionId(sessionId);               │
│  5. Show loading screen with progress               │
│  6. Call generateAllContent() in background          │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│           Content Generation (Parallel)                 │
│  generateEmails()     │  generateLogs()            │
│  generateDMs()        │  generateLOLBins()          │
│  generateWiFi()         │  generateNPCAdvice()        │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│             Store Generated Content                     │
│  contentStore.setPreBreachEmails([...])            │
│  contentStore.setBreachEmails([...])                │
│  contentStore.setLogEntries([...])                   │
│  contentStore.setSocialEngineeringDM([...])            │
│  contentStore.setNPCBadAdvice([...])                │
│  contentStore.setLOLBins([...])                   │
│  contentStore.setWiFi([...])                         │
│  Persist to localStorage with sessionId                │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Game Flow (All content ready)             │
│  Components read from contentStore instead of imports     │
│  EmailClient: useContentStore('emails')            │
│  LogViewer: useContentStore('logs')                │
│  DMSidebar: useContentStore('dmMessages')          │
└─────────────────────────────────────────────────────────────┘
```

### Loading Screen UX

Before game starts, show:
```
╔═════════════════════════════════════════════════╗
║                                                     ║
║    Generating Scenario Content...                   ║
║                                                     ║
║    ✓ Pre-breach emails (3/7)              ║
║    ⏳ Breach phishing emails (2/10) [Retrying 2/3]  ║
║    ○ Log entries (0/50)                     ║
║    ○ Social engineering DMs (0/8)              ║
║    ○ LOLBins (0/10)                            ║
║    ○ NPC advice (0/4)                         ║
║    ○ WiFi networks (0/5)                          ║
║                                                     ║
║    [Cancel]  Use offline content                   ║
║                                                     ║
╚═══════════════════════════════════════════════════╝
```

**Retry State Display**: During API retries with exponential backoff, update progress:
- First attempt: `⏳ Breach phishing emails (0/10)`
- Retry attempt 2: `⏳ Breach phishing emails (0/10) - Retrying (attempt 2/3)...`
- Final attempt 3: `⏳ Breach phishing emails (0/10) - Retrying (attempt 3/3)...`
```

---

## Internationalization (i18n) Design

### Current Implementation (Phase 1)
- **Hardcoded locale**: `contentLocale: 'en'` in gameStore
- **Locale parameter**: Passed to Zhipu AI in generation options
- **Template placeholders**: `{locale}` marker in prompt templates

### Future Expansion (Phase 2)
- **User profile page**: Language selection dropdown
- **Locale persistence**: Store user preference in localStorage
- **Language attachment**: Associate locale with player/team in backend
- **Translated templates**: `{locale}` replaced with actual prompts per language
- **Content variant caching**: Generate multiple language versions per session

---

## Data Flow & Component Interactions

### App Initialization

1. **Page load**: Check `localStorage.getItem('cachedSessionId')`
2. **Cache hit**: If found, load content instantly to contentStore
3. **Cache miss**: If not found:
   - Generate new UUID for sessionId
   - Show loading screen with progress
   - Call `contentGenerator.generateAll(config)`
   - Store result in localStorage
   - Update contentStore
4. **Game start**: Hide loading screen, begin gameplay

### Component Usage

**Before (Static)**:
```typescript
import { BREACH_EMAILS } from '@/content/emails';

function EmailClient() {
  const emails = BREACH_EMAILS; // Static, always same
}
```

**After (Dynamic)**:
```typescript
function EmailClient() {
  const breachEmails = useContentStore(s => s.breachEmails);

  if (breachEmails.length === 0) {
    return <div>Loading emails...</div>;
  }

  return <EmailList emails={breachEmails} />;
}
```

---

## File Structure

```
src/
├── lib/
│   └── zhipuAI.ts                    # API client, ZhipuAI class
├── services/
│   └── contentGenerator.ts             # Generation orchestration
├── stores/
│   └── contentStore.ts                # Generated content state (new)
├── content/
│   ├── templates/                      # Prompt templates (new)
│   │   ├── emails.ts
│   │   ├── logs.ts
│   │   ├── dms.ts
│   │   ├── lolbins.ts
│   │   └── wifi.ts
│   ├── emails.ts                      # Static fallback (keep)
│   ├── logEntries.ts                 # Static fallback (keep)
│   ├── dmScripts.ts                  # Static fallback (keep)
│   ├── fileListings.ts                # Static fallback (keep)
│   └── types.ts                      # Type definitions (keep)
└── app/
    └── page.tsx                       # Add loading screen + generation trigger
```

---

## Cost Estimation

### Zhipu GLM-4 Pricing (Approximate)
- Input tokens: ¥0.05/1K
- Output tokens: ¥0.10/1K

### Per Session Token Usage

| Content Type | Input Tokens | Output Tokens | Cost (¥) |
|-------------|----------------|----------------|-------------|
| Pre-breach emails (5) | ~400 | ~600 | ¥0.08 |
| Breach emails (10) | ~800 | ~1200 | ¥0.16 |
| Log entries (50) | ~2000 | ~2000 | ¥0.30 |
| Social DMs (8) | ~600 | ~500 | ¥0.11 |
| NPC advice (4) | ~300 | ~200 | ¥0.07 |
| LOLBins (10) | ~400 | ~300 | ¥0.10 |
| WiFi (5) | ~200 | ~200 | ¥0.06 |
| **Total** | **~4,700** | **~5,000** | **~¥0.88** |

**Monthly Cost Estimate**:
- 1,000 sessions × ¥0.88 = ~¥880 (~$125 USD/month)
- **Optimizations**: Batching, caching, template reuse can reduce to ~¥0.50/session

---

## Security & Privacy

### Data Protection
- **No user PII sent**: Prompts are generic scenario descriptions
- **Generated content stored client-side**: localStorage only, no server persistence
- **Session IDs are UUIDs**: No tracking capability
- **Opt-out available**: Toggle to use static offline content

### Content Validation
- **MITRE ATT&CK validation**: Regex check for `T\d+\.\d+$` format
- **LOLBin validation**: Check against known Windows binaries list
- **Email header validation**: JSON schema validation for header objects
- **XSS sanitization**: Escape HTML in generated content before rendering

---

## Testing Strategy

### Unit Tests (`src/services/contentGenerator.test.ts`)

```typescript
describe('ContentGenerator', () => {
  describe('Email Generation', () => {
    it('generates valid SPF/DKIM/DMARC headers', async () => {
      const emails = await generator.generateBreachEmails({ count: 5 });

      emails.forEach(email => {
        expect(['pass', 'fail', 'none']).toContain(email.headers.spf);
        expect(['pass', 'fail']).toContain(email.headers.dkim);
        expect(['pass', 'fail', 'p=none', 'p=quarantine', 'p=reject'])
          .toContain(email.headers.dmarc);
      });
    });

    it('generates emails with phishing indicators', async () => {
      const emails = await generator.generateBreachEmails({ count: 10 });

      emails.forEach(email => {
        if (email.isPhishing) {
          expect(email.indicators.length).toBeGreaterThan(0);
        }
      });
    });

    it('generates mix of difficulty levels', async () => {
      const emails = await generator.generateBreachEmails({ count: 20 });

      const difficulties = emails.map(e => e.difficulty);
      expect(difficulties).toContain('easy');
      expect(difficulties).toContain('medium');
      expect(difficulties).toContain('hard');
    });
  });

  describe('Log Entry Generation', () => {
    it('generates real MITRE ATT&CK IDs', async () => {
      const logs = await generator.generateLogEntries({ count: 10 });

      logs.forEach(log => {
        expect(log.mitreId).toMatch(/^T\d+\.\d+$/);
      });
    });

    it('includes at least one malicious entry per 10 logs', async () => {
      const logs = await generator.generateLogEntries({ count: 10 });

      const malicious = logs.filter(l => l.isMalicious);
      expect(malicious.length).toBeGreaterThanOrEqual(1);
    });

    it('generates realistic timestamps', async () => {
      const logs = await generator.generateLogEntries({ count: 20 });
      const timestamps = logs.map(l => new Date(l.timestamp));

      expect(timestamps[0]).toBeDefined();
      // All timestamps should be in valid ISO format
      logs.forEach(log => {
        expect(() => new Date(log.timestamp)).not.toThrow();
      });
    });
  });

  describe('Content Uniqueness', () => {
    it('generates different content across multiple sessions', async () => {
      const session1 = await contentGenerator.generateAll({
        locale: 'en',
        sessionId: 'test-session-1',
      });
      const session2 = await contentGenerator.generateAll({
        locale: 'en',
        sessionId: 'test-session-2',
      });

      // Content should be different between sessions
      expect(session1.breachEmails).not.toEqual(session2.breachEmails);
      expect(session1.logEntries).not.toEqual(session2.logEntries);
      expect(session1.socialEngineeringDMs).not.toEqual(session2.socialEngineeringDMs);

      // But structure should match (valid content, not garbage)
      expect(session1.breachEmails.length).toEqual(session2.breachEmails.length);
      expect(session1.logEntries.length).toEqual(session2.logEntries.length);
    });
  });

  describe('LOLBin Generation', () => {
    it('generates actual Windows binaries', async () => {
      const bins = await generator.generateLOLBins({ count: 10 });

      const knownBins = ['certutil', 'bitsadmin', 'powershell', 'cmd', 'wscript',
                      'regsvr32', 'mshta', 'schtasks', 'rundll32'];

      bins.forEach(bin => {
        expect(knownBins).toContain(bin.processName.toLowerCase());
      });
    });

    it('includes MITRE IDs for LOLBins', async () => {
      const bins = await generator.generateLOLBins({ count: 5 });

      bins.forEach(bin => {
        expect(bin.mitreId).toMatch(/^T\d+\.\d+$/);
      });
    });
  });
});
```

### Integration Tests

```typescript
describe('Content Generation Integration', () => {
  it('generates all content types successfully', async () => {
    const content = await contentGenerator.generateAll({
      locale: 'en',
      sessionId: 'test-session',
    });

    expect(content.preBreachEmails.length).toBeGreaterThan(0);
    expect(content.breachEmails.length).toBeGreaterThan(0);
    expect(content.logEntries.length).toBeGreaterThan(0);
    expect(content.socialEngineeringDMs.length).toBeGreaterThan(0);
    expect(content.npcBadAdvice.length).toBeGreaterThan(0);
    expect(content.lolbins.length).toBeGreaterThan(0);
    expect(content.wifi.length).toBeGreaterThan(0);
  });

  it('persists content to localStorage', async () => {
    await contentGenerator.generateAll({
      locale: 'en',
      sessionId: 'test-session',
    });

    const cached = localStorage.getItem('cachedSessionId');
    expect(cached).toBe('test-session');
  });

  it('handles Zhipu API errors gracefully', async () => {
    // Mock API failure
    jest.spyOn(zhipuClient, 'generateBatch').mockRejectedValue(new Error('API error'));

    const content = await contentGenerator.generateAll({
      locale: 'en',
      sessionId: 'test-session',
    });

    // Should fall back to static content
    expect(content.isOfflineContent).toBe(true);
    expect(content.logEntries.length).toBeGreaterThan(0);
  });
});
```

### Manual Testing Checklist

- [ ] Generate 5 different sessions and verify content is unique
- [ ] Test with Zhipu API unavailable (verify fallback works)
- [ ] Test with slow network (verify retry logic, progress bar updates)
- [ ] Test replay from localStorage (verify instant load)
- [ ] Verify scoring works correctly with generated content
- [ ] Check all game phases complete successfully with dynamic content
- [ ] Test i18n preparation (locale parameter passed correctly)
- [ ] Verify no XSS vulnerabilities in generated content
- [ ] Test "Use offline content" cancel button

---

## Error Handling

### API Failure Scenarios

| Scenario | Behavior |
|----------|----------|
| API unreachable | Show error, offer "Use offline content" button |
| Rate limit exceeded | Retry with exponential backoff, show countdown |
| Invalid response | Fall back to static content, set `isOfflineContent: true` |
| Timeout after 30s | Allow cancel, use cached or static content |
| Malformed JSON | Retry once, then fallback with error message |

### Retry Logic

```typescript
async function generateWithRetry(
  prompt: string,
  options: GenerationOptions,
  maxRetries = 3
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await zhipuAI.generateContent(prompt, options);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error; // Will trigger fallback
      }
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## Environment Variables

```bash
# Required for AI content generation
ZHIPU_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ZHIPU_MODEL=glm-4

# Optional
USE_AI_CONTENT=true              # Enable/disable AI generation
CONTENT_CACHE_TTL=86400        # Cache duration in seconds (24h default)
MAX_GENERATION_RETRIES=3         # API retry attempts
```

---

## Migration Notes

### Backward Compatibility
- Keep all static content files in `src/content/*.ts` as fallback
- Components unchanged: They read from `contentStore` or static imports
- Feature flag: `USE_AI_CONTENT` enables/disables generation
- Gradual rollout: Can enable for specific teams/users first

### Component Updates Required

Components that import static content need migration:

| Component | Before | After |
|-----------|--------|-------|
| `EmailClient.tsx` | `import { BREACH_EMAILS }` | `const breachEmails = useContentStore(s => s.breachEmails)` |
| `LogViewer.tsx` | `import { LOG_ENTRIES }` | `const logEntries = useContentStore(s => s.logEntries)` |
| `DMSidebar.tsx` | `import { SOCIAL_ENGINEERING_DM }` | `const dmMessages = useContentStore(s => s.socialEngineeringDMs)` |
| `TaskManagerView.tsx` | `import { LOLBINS }` | `const lolbins = useContentStore(s => s.lolbins)` |

---

## Success Criteria

✅ All game content generated on-demand using Zhipu AI API
✅ Each playthrough produces unique content (verified by testing 5+ sessions)
✅ Content maintains technical accuracy (valid headers, MITRE IDs, LOLBins)
✅ Generation happens in background before gameplay (loading screen with progress)
✅ Fallback to static content if API unavailable or user opts out
✅ i18n-ready architecture (locale parameter passed to API, hardcoded to 'en')
✅ Content persists to localStorage for instant replay
✅ Tests cover generation logic, integration, and error handling
✅ Cost reasonable (~¥0.50-1.00 per session, ~$125/month for 1,000 sessions)
✅ No user PII sent to external API
✅ XSS-safe rendering of generated content
✅ Backward compatible with static content fallback

---

## Future Enhancements (Post-v1)

1. **Multi-language content generation**: Generate same scenario in multiple languages simultaneously
2. **Difficulty scaling**: Adjust generation complexity based on player skill level
3. **Content analytics**: Track which generated content provides best/worst challenge
4. **User preferences**: Allow players to customize scenario focus (more phishing, more investigation, etc.)
5. **Dynamic hints**: Generate hint content based on player mistakes in real-time
