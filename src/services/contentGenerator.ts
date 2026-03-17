import type { Email, LogEntry, DMMessage, LOLBin, WiFiNetwork, EmailHeader } from '@/content/types';
import type { ZhipuAIClient } from '@/lib/zhipuAI';
import { createZhipuAIClient } from '@/lib/zhipuAI';

export interface GeneratedContent {
  preBreachEmails: Email[];
  breachEmails: Email[];
  logEntries: LogEntry[];
  socialEngineeringDMs: DMMessage[];
  npcBadAdvice: DMMessage[];
  lolbins: LOLBin[];
  wifi: WiFiNetwork[];
  sessionId: string;
  isOfflineContent: boolean;
}

export interface GenerationConfig {
  locale: string;
  sessionId: string;
  temperature?: number;
}

export class ContentGenerator {
  constructor(private zhipuClient: ZhipuAIClient) {}

  async generateAll(config: GenerationConfig): Promise<GeneratedContent> {
    const temperature = config.temperature ?? 0.9;

    // Generate all content in parallel
    const [
      preBreachEmails,
      breachEmails,
      logEntries,
      socialEngineeringDMs,
      npcBadAdvice,
      lolbins,
      wifi,
    ] = await Promise.all([
      this.generatePreBreachEmails(5, config.locale, temperature),
      this.generateBreachEmails(10, config.locale, temperature),
      this.generateLogEntries(50, config.locale, temperature),
      this.generateSocialEngineeringDMs(8, config.locale, temperature),
      this.generateNPCBadAdvice(4, config.locale, temperature),
      this.generateLOLBins(10, config.locale, temperature),
      this.generateWiFi(5, config.locale, temperature),
    ]);

    return {
      preBreachEmails,
      breachEmails,
      logEntries,
      socialEngineeringDMs,
      npcBadAdvice,
      lolbins,
      wifi,
      sessionId: config.sessionId,
      isOfflineContent: false,
    };
  }

  private async generatePreBreachEmails(count: number, locale: string, temperature: number): Promise<Email[]> {
    const prompt = `Generate ${count} normal corporate emails for a cybersecurity training scenario.

Requirements:
- Valid SPF/DKIM/DMARC headers (pass/fail values)
- Professional corporate language
- Include IT announcements, onboarding information
- Locale: ${locale}
- From/To: use realistic corporate domains (e.g., @nexuscorp.com)

Format as JSON array matching Email interface. Each email must have: id, from, to, subject, date, body, headers (with returnPath, spf, dkim, dmarc), isPhishing (false), indicators ([]), difficulty ("easy"|"medium"|"hard").`;

    const response = await this.zhipuClient.generateContent(prompt, { locale, temperature });
    return this.parseJSON<Email[]>(response);
  }

  private async generateBreachEmails(count: number, locale: string, temperature: number): Promise<Email[]> {
    const prompt = `Generate ${count} phishing emails for a corporate cybersecurity training scenario.

Requirements:
- Valid SPF/DKIM/DMARC headers (pass/fail/p=none/p=quarantine/p=reject)
- Include 1-3 subtle phishing indicators per email
- Mix of easy/medium/hard difficulty
- Urgency tactics, suspicious from addresses
- Locale: ${locale}

Format as JSON array matching Email interface. Each email must have: id, from, to, subject, date, body, headers (with returnPath, spf, dkim, dmarc), difficulty ("easy"|"medium"|"hard").`;

    const response = await this.zhipuClient.generateContent(prompt, { locale, temperature });
    const emails = this.parseJSON<Email[]>(response);
    return emails.map(email => ({
      ...email,
      isPhishing: true,
      indicators: this.extractIndicators(email.body, email.headers),
      difficulty: email.difficulty || 'medium',
    }));
  }

  private async generateLogEntries(count: number, locale: string, temperature: number): Promise<LogEntry[]> {
    const prompt = `Generate ${count} log entries for a cybersecurity investigation scenario.

Requirements:
- Mix of INFO, WARN, ERROR, CRITICAL levels
- Include legitimate sources: systemd, cron, nginx, postfix
- Include malicious sources: sshd, cmd.exe, powershell.exe
- Realistic timestamps within 24-hour window
- IP addresses in corporate subnet (10.0.0.0/8 or 185.234.x.x)
- MITRE ATT&CK IDs in Txxxx.xxx format
- Include both legitimate and suspicious activity
- Locale: ${locale}

Format as JSON array matching LogEntry interface. Each entry must have: id, timestamp, level, source, message, isMalicious, optional attackTechnique and mitreId.`;

    const response = await this.zhipuClient.generateContent(prompt, { locale, temperature });
    return this.parseJSON<LogEntry[]>(response);
  }

  private async generateSocialEngineeringDMs(count: number, locale: string, temperature: number): Promise<DMMessage[]> {
    const prompt = `Generate ${count} social engineering DM messages for a cybersecurity training scenario.

Requirements:
- Realistic corporate jargon (IT director, security manager, help desk)
- Phishing attempts: credential requests, urgent access, vendor impersonation
- Multi-choice responses with correct/wrong options
- Include trustDelta (-20 to +20) and scoring (0-5 points)
- Avatar initials, senderRole field
- Locale: ${locale}

Format as JSON array matching DMMessage interface. Each message must have: id, sender, senderRole, avatar, text, timestamp (number), choices array. Each choice must have: id, label, isCorrect, trustDelta, optional scoreEffect, optional nextMessageId, optional flag.`;

    const response = await this.zhipuClient.generateContent(prompt, { locale, temperature });
    return this.parseJSON<DMMessage[]>(response);
  }

  private async generateNPCBadAdvice(count: number, locale: string, temperature: number): Promise<DMMessage[]> {
    const prompt = `Generate ${count} bad advice messages from security staff during incident response scenario.

Requirements:
- Poor containment advice (disable account only, ignore logs, mass password reset)
- Realistic security roles (network engineer, help desk, senior sysadmin)
- Incorrect guidance that sounds plausible
- Include trustDelta (-10 to -5) and scoring
- Locale: ${locale}

Format as JSON array matching DMMessage interface with isBadAdvice: true. Each message must have: id, sender, senderRole, avatar, text, timestamp (number), choices array. Each choice must have: id, label, isCorrect, trustDelta, optional scoreEffect.`;

    const response = await this.zhipuClient.generateContent(prompt, { locale, temperature });
    const dms = this.parseJSON<DMMessage[]>(response);
    return dms.map(dm => ({ ...dm, isBadAdvice: true }));
  }

  private async generateLOLBins(count: number, locale: string, temperature: number): Promise<LOLBin[]> {
    const knownBins = ['certutil', 'bitsadmin', 'powershell', 'cmd', 'wscript', 'regsvr32', 'mshta', 'schtasks', 'rundll32'];
    const prompt = `Generate ${count} LOLBin (Living Off The Land) entries for cybersecurity training.

Requirements:
- Use actual Windows binaries: ${knownBins.join(', ')}
- Include both legitimate usage patterns and malicious attack patterns
- MITRE ATT&CK IDs in Txxxx.xxx format
- Process IDs (pid), command lines with flags
- Locale: ${locale}

Format as JSON array matching LOLBin interface. Each entry must have: id, processName, pid, commandLine, isMalicious, description, optional mitreId.`;

    const response = await this.zhipuClient.generateContent(prompt, { locale, temperature });
    return this.parseJSON<LOLBin[]>(response);
  }

  private async generateWiFi(count: number, locale: string, temperature: number): Promise<WiFiNetwork[]> {
    const prompt = `Generate ${count} WiFi network entries including Evil Twin APs for cybersecurity training.

Requirements:
- Realistic BSSID format (XX:XX:XX:XX:XX:XX)
- Signal strength in dBm (-30 to -90 range)
- Mix of WPA2-PSK (evil twin indicator), 802.1X (corporate), Open (suspicious)
- Include SSID names
- Locale: ${locale}

Format as JSON array matching WiFiNetwork interface. Each network must have: ssid, bssid, signalStrength, authType ("WPA2-PSK"|"802.1X"|"Open"), isEvilTwin, indicators array.`;

    const response = await this.zhipuClient.generateContent(prompt, { locale, temperature });
    return this.parseJSON<WiFiNetwork[]>(response);
  }

  private parseJSON<T>(response: string): T {
    try {
      const jsonMatch = response.match(/```json\n([\s\S]+)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]) as T;
      }
      // Try direct JSON parse
      return JSON.parse(response) as T;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Generated content is not valid JSON');
    }
  }

  private extractIndicators(body: string, headers: EmailHeader): string[] {
    const indicators: string[] = [];

    // Check for urgency words
    if (/urgent|immediate|asap|deadline/i.test(body)) indicators.push('Urgency language');

    // Check for suspicious headers
    if (headers.dkim === 'fail') indicators.push('DKIM fail');
    if (headers.spf === 'fail') indicators.push('SPF fail');
    if (headers.dmarc?.includes('fail')) indicators.push('DMARC fail');

    // Check for typos in domain
    if (/[a-z0-9]+@[a-z0-9]+\.[a-z]{2,}/i.test(body)) {
      indicators.push('Potential domain typo');
    }

    return indicators.length > 0 ? indicators : [];
  }
}

export function createContentGenerator(): ContentGenerator | null {
  const client = createZhipuAIClient();
  if (!client) {
    console.warn('Content generator disabled - using fallback content');
    return null;
  }
  return new ContentGenerator(client);
}
