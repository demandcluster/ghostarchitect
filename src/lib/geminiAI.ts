export interface GeminiAIConfig {
  apiKey: string;
  model: 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-1.0-pro';
  baseURL?: string;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  locale?: string;
}

export interface GenerationError {
  message: string;
  statusCode?: number;
  isRetryable?: boolean;
}

export interface BatchGenerationConfig {
  locale: string;
  sessionId: string;
  temperature?: number;
}

export class GeminiAIClient {
  private config: GeminiAIConfig;

  constructor(config: GeminiAIConfig) {
    this.config = {
      baseURL: config.baseURL || 'https://generativelanguage.googleapis.com/v1beta/',
      ...config
    };
  }

  async generateBatch(config: BatchGenerationConfig): Promise<{
    preBreachEmails: string;
    breachEmails: string;
    logEntries: string;
    socialEngineeringDMs: string;
    npcBadAdvice: string;
    lolbins: string;
    wifi: string;
    sessionId: string;
    isOfflineContent: boolean;
  }> {
    const temperature = config.temperature ?? 0.9;

    // Create a comprehensive prompt for batch generation
    const batchPrompt = `Generate all content for a cybersecurity training scenario in a single response.

You must respond with a valid JSON object containing ALL of these fields:
{
  "preBreachEmails": [array of5 normal corporate emails],
  "breachEmails": [array of10 phishing emails],
  "logEntries": [array of50 log entries],
  "socialEngineeringDMs": [array of8 social engineering DM messages],
  "npcBadAdvice": [array of4 bad advice messages],
  "lolbins": [array of10 LOLBin entries],
  "wifi": [array of5 WiFi network entries]
}

Requirements for each content type:

**Pre-breach Emails (5):**
- Valid SPF/DKIM/DMARC headers (pass/fail values)
- Professional corporate language
- Include IT announcements, onboarding information
- Locale: ${config.locale}
- From/To: use realistic corporate domains (e.g., @nexuscorp.com)
- Each email must have: id, from, to, subject, date, body, headers (with returnPath, spf, dkim, dmarc), isPhishing (false), indicators ([]), difficulty ("easy"|"medium"|"hard")

**Breach Phishing Emails (10):**
- Valid SPF/DKIM/DMARC headers (pass/fail/p=none/p=quarantine/p=reject)
- Include 1-3 subtle phishing indicators per email
- Mix of easy/medium/hard difficulty
- Urgency tactics, suspicious from addresses
- Locale: ${config.locale}

**Log Entries (50):**
- Mix of INFO, WARN, ERROR, CRITICAL levels
- Include legitimate sources: systemd, cron, nginx, postfix
- Include malicious sources: sshd, cmd.exe, powershell.exe
- Realistic timestamps within 24-hour window
- IP addresses in corporate subnet (10.0.0.0/8 or 185.234.x.x)
- MITRE ATT&CK IDs in Txxxx.xxx format
- Include both legitimate and suspicious activity
- Locale: ${config.locale}
- Each entry must have: id, timestamp, level, source, message, isMalicious, optional attackTechnique and mitreId

**Social Engineering DMs (8):**
- Realistic corporate jargon (IT director, security manager, help desk)
- Phishing attempts: credential requests, urgent access, vendor impersonation
- Multi-choice responses with correct/wrong options
- Include trustDelta (-20 to +20) and scoring (0-5 points)
- Avatar initials, senderRole field
- Locale: ${config.locale}
- Each message must have: id, sender, senderRole, avatar, text, timestamp (number), choices array. Each choice must have: id, label, isCorrect, trustDelta, optional scoreEffect, optional nextMessageId, optional flag.

**NPC Bad Advice (4):**
- Poor containment advice (disable account only, ignore logs, mass password reset)
- Realistic security roles (network engineer, help desk, senior sysadmin)
- Incorrect guidance that sounds plausible
- Include trustDelta (-10 to -5) and scoring
- Locale: ${config.locale}
- Each message must have: id, sender, senderRole, avatar, text, timestamp (number), choices array. Each choice must have: id, label, isCorrect, trustDelta, optional scoreEffect.

**LOLBins (10):**
- Use actual Windows binaries: certutil, bitsadmin, powershell, cmd, wscript, regsvr32, mshta, schtasks, rundll32
- Include both legitimate usage patterns and malicious attack patterns
- MITRE ATT&CK IDs in Txxxx.xxx format
- Process IDs (pid), command lines with flags
- Locale: ${config.locale}
- Each entry must have: id, processName, pid, commandLine, isMalicious, description, optional mitreId.

**WiFi Networks (5):**
- Realistic BSSID format (XX:XX:XX:XX:XX)
- Signal strength in dBm (-30 to -90 range)
- Mix of WPA2-PSK (evil twin indicator), 802.1X (corporate), Open (suspicious)
- Include SSID names
- Locale: ${config.locale}
- Each network must have: ssid, bssid, signalStrength, authType ("WPA2-PSK"|"802.1X"|"Open"), isEvilTwin, indicators array

Return ONLY valid JSON, no markdown, no additional text.`;

    const response = await fetch(`${this.config.baseURL}models/${this.config.model}:generateContent?key=${this.config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: batchPrompt
          }]
        }],
        generationConfig: {
          temperature: temperature
        }
      })
    });

    if (!response.ok) {
      const error: GenerationError = {
        message: response.statusText,
        statusCode: response.status,
        isRetryable: response.status === 429 || response.status >= 500
      };
      throw error;
    }

    const responseData = await response.json();

    // Parse the Gemini response
    const generatedContent = responseData.candidates[0].content.parts[0].text;

    // Set session ID from config
    const parsedContent = JSON.parse(generatedContent) as any;
    parsedContent.sessionId = config.sessionId;
    parsedContent.isOfflineContent = false;

    return parsedContent;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseURL}models?key=${this.config.apiKey}`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export function createGeminiAIClient(): GeminiAIClient | null {
  // Use server-side environment variable (not NEXT_PUBLIC_*) to keep API key secure
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Gemini API key not found, content generation disabled");
    return null;
  }

  const model = (process.env.GEMINI_MODEL as 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-1.0-pro') || 'gemini-1.5-flash';

  return new GeminiAIClient({ apiKey, model });
}
