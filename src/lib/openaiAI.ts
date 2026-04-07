import type {
  Email,
  LogEntry,
  LOLBin,
  WiFiNetwork
} from "@/content/types";

const DEFAULT_MODEL = "gpt-5.4";

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface GenerationError {
  message: string;
  statusCode?: number;
  isRetryable?: boolean;
}

export type GenerationSection = "initial" | "secondary" | "all";

export interface BatchGenerationConfig {
  locale: string;
  sessionId: string;
  temperature?: number;
  section?: GenerationSection;
  teamName?: string;
  fakeDomain?: string;
}

export interface GeneratedContent {
  preBreachEmails: Email[];
  breachEmails: Email[];
  logEntries: LogEntry[];
  lolbins: LOLBin[];
  wifi: WiFiNetwork[];
  expectedIOCs: unknown[];
  sessionId: string;
  isOfflineContent: boolean;
}

// ─── Shared prompt fragments ───────────────────────────────────────────

const PLACEHOLDER_RULES = `IMPORTANT: Use these EXACT placeholders in all generated text:
- "[teamName]" for the company name
- "[fakeDomain]" for the corporate domain
- "[playerHandle]" for the user's name
- "[phishing-link]" for malicious links/payloads`;

const INITIAL_PROMPT = `You are generating content for a cybersecurity training simulation aimed at skilled IT professionals.

${PLACEHOLDER_RULES}

CONTENT: EMAILS (onboarding + breach phase)

preBreachEmails — EXACTLY 5 legitimate corporate emails.
  These set the scene before a breach is detected. Topics should reflect modern corporate IT:
  Entra ID conditional access policy rollouts, ISO 27001 audit prep, EDR deployment notices,
  MFA migration announcements, or IT change-management approvals.
  ALL headers MUST pass (spf/dkim/dmarc = "pass"). No suspicious links.

breachEmails — EXACTLY 8 emails. EXACTLY 4 LEGITIMATE + 4 PHISHING.
  The player must distinguish real emails from sophisticated phishing.
  - LEGITIMATE emails: passing headers, no suspicious links, realistic corporate content.
  - PHISHING emails: MUST reflect 2024-2026 attack vectors — Adversary-in-the-Middle (AiTM),
    Evilginx proxy pages, Device Code Phishing (OAuth), session cookie theft, or MFA fatigue/push bombing.
    Each phishing email MUST have at least one header failure (spf/dkim/dmarc = "fail") or a
    domain spoofing artifact (e.g., returnPath domain ≠ from domain).
    DO NOT use obvious typos, "Nigerian prince" lures, or generic .exe attachments.
    Use "[phishing-link]" as the malicious URL placeholder.

  "indicators" field: array of 2-4 short strings a trained analyst would notice.
  For phishing: e.g., "SPF fail from external domain", "returnPath mismatch", "urgency + credential request".
  For legitimate: e.g., "SPF/DKIM/DMARC all pass", "internal domain only", "no action required".

  "difficulty": phishing emails should have a mix — 1 "easy", 2 "medium", 1 "hard".
  Legitimate emails should all be "medium" (they are decoys that might trick trigger-happy players).`;

const SECONDARY_PROMPT = `You are generating investigation-phase content for a cybersecurity training simulation aimed at skilled IT professionals.

${PLACEHOLDER_RULES}

CONTENT: INVESTIGATION (logs, LOLBins, WiFi, IOCs)

1. logEntries — EXACTLY 20 log entries. EXACTLY 14 LEGITIMATE (70%) + 6 MALICIOUS (30%).
   Logs MUST tell a coherent MITRE ATT&CK kill chain story:
   - Initial Access: Azure AD / Entra ID sign-in anomalies (AiTM token theft, impossible travel, residential proxy IPs)
   - Execution: LOLBin abuse with accurate Windows Event IDs (4688 for process creation)
   - Persistence: Event ID 7045 (new service) with suspicious binary paths in user-writable dirs
   - Lateral Movement: Event ID 4624 Type 3 to a Domain Controller, or CloudTrail AssumeRole
   - Exfiltration/C2: DNS beaconing, unusual outbound on port 443 to non-CDN IPs

   LEGITIMATE logs: routine AD authentications, scheduled tasks, Windows Update, AV scans, backup jobs.
   They must look boring and normal — the player needs realistic noise to filter through.

   FIELD FORMAT (exact keys):
   { "id": "gen-log-N", "timestamp": "2026-03-22T14:32:01Z", "level": "INFO|WARN|ERROR|CRITICAL",
     "source": "process or service name", "message": "single human-readable log line",
     "isMalicious": true/false }
   The "message" MUST be a single descriptive string (not split into sub-fields).
   Include Event IDs, source/destination IPs, and command lines inline within the message.
   Optional: "attackTechnique" (string), "mitreId" (e.g., "T1059.001").

2. lolbins — EXACTLY 10 processes. EXACTLY 5 LEGITIMATE + 5 MALICIOUS.
   The player sees a Task Manager view and must decide quarantine vs. ignore for each.
   - MALICIOUS: real LOLBin abuse — certutil downloading payloads, powershell with encoded commands,
     mshta executing remote HTA, regsvr32 /s /n /u /i: proxy execution, bitsadmin transfers.
     Command lines must be realistic and specific (full paths, actual flags, plausible C2 IPs).
   - LEGITIMATE: normal Windows processes — explorer.exe, svchost.exe with valid service flags,
     Windows Update (wuauclt.exe), Microsoft Teams updater, OneDrive sync.
     These are decoys — quarantining a legitimate process penalizes the player.

   FIELD FORMAT (exact keys):
   { "id": "gen-lolbin-N", "processName": "certutil.exe", "pid": 4872,
     "commandLine": "full command with args", "isMalicious": true/false,
     "description": "what this process is doing", "mitreId": "T1105" }
   Every process MUST have a unique pid (integer, 1000-65000 range).

3. wifi — EXACTLY 6 networks. EXACTLY 1 EVIL TWIN + 5 LEGITIMATE/BACKGROUND.
   The player must identify the safe corporate network vs. the evil twin.
   - CORPORATE (1): SSID = "[teamName]-Secure", authType = "802.1X", signal = -45 to -55, isEvilTwin = false.
   - EVIL TWIN (1): SSID similar to corporate (e.g., "[teamName]-Secure" or "[teamName]-Guest"),
     authType = "WPA2-PSK" (weaker than 802.1X!), signal = -25 to -35 (suspiciously strong),
     isEvilTwin = true, indicators = ["Stronger signal than corporate AP", "WPA2-PSK instead of 802.1X"].
   - BACKGROUND (4): random neighbor/public networks (e.g., "NETGEAR-5G", "Airport_FreeWiFi",
     "HP-Print-LaserJet", "xfinitywifi"). Mix of "WPA2-PSK", "Open". isEvilTwin = false.

   FIELD FORMAT (exact keys):
   { "id": "gen-wifi-N", "ssid": "...", "bssid": "AA:BB:CC:DD:EE:FF",
     "signalStrength": -45, "authType": "WPA2-PSK" | "802.1X" | "Open",
     "isEvilTwin": true/false, "indicators": ["hint 1", "hint 2"] }
   BSSIDs must be valid MAC format. Signal strength in dBm (negative integer, -25 to -85).

4. expectedIOCs — EXACTLY 6 IOCs extracted from the malicious log entries.
   Each IOC MUST correspond to a specific malicious log entry — if a log shows C2 traffic to
   185.234.72.19, then an IOC with value "185.234.72.19" must exist.
   Types: "Attacker IP", "C2 Domain", "Malicious File Path", "Compromised Account", "File Hash", "Suspicious Token".

   FIELD FORMAT (exact keys):
   { "type": "Attacker IP", "value": "185.234.72.19", "hint": "Source of lateral movement in log gen-log-7" }`;

// ─── JSON structure appendix (appended to all prompts) ─────────────────

const JSON_STRUCTURE_RULES = `
IMPORTANT: Return ONLY a valid JSON object with the EXACT top-level keys listed above. No markdown, no commentary.

MANDATORY RULES:
1. Every object in every array MUST have a unique "id" field.
2. Use ID prefixes: "gen-email-N" for emails, "gen-log-N" for logs, "gen-lolbin-N" for LOLBins, "gen-wifi-N" for WiFi.
3. Boolean fields (isPhishing, isMalicious, isEvilTwin) MUST be actual booleans (true/false), not strings.
4. The malicious/legitimate ratio specified above is MANDATORY for scoring balance. Do not deviate.

EMAIL JSON STRUCTURE:
{
  "id": "gen-email-1",
  "from": "Jane Smith <jane.smith@[fakeDomain]>",
  "to": "[playerHandle]@[fakeDomain]",
  "subject": "...",
  "date": "2026-03-22T09:15:00Z",
  "body": "multi-line email body text",
  "isPhishing": false,
  "indicators": ["SPF/DKIM/DMARC all pass", "internal sender"],
  "difficulty": "medium",
  "headers": {
    "returnPath": "<jane.smith@[fakeDomain]>",
    "spf": "pass",
    "dkim": "pass",
    "dmarc": "pass"
  }
}
Headers spf/dkim/dmarc MUST be exactly "pass" or "fail" — never empty strings.`;

// ─── OpenAI Client ─────────────────────────────────────────────────────

export class OpenAIClient {
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = {
      baseURL: config.baseURL || "https://api.openai.com/v1/",
      model: config.model || DEFAULT_MODEL,
      ...config
    };
  }

  async generateBatch(
    config: BatchGenerationConfig
  ): Promise<GeneratedContent> {
    const temperature = config.temperature ?? 0.9;
    const section = config.section ?? "all";

    let sectionPrompt = "";
    let requiredFields: string[] = [];

    if (section === "initial") {
      requiredFields = ["preBreachEmails", "breachEmails"];
      sectionPrompt = INITIAL_PROMPT;
    } else if (section === "secondary") {
      requiredFields = ["logEntries", "expectedIOCs", "lolbins", "wifi"];
      sectionPrompt = SECONDARY_PROMPT;
    } else {
      requiredFields = ["preBreachEmails", "breachEmails", "logEntries", "expectedIOCs", "lolbins", "wifi"];
      sectionPrompt = `${INITIAL_PROMPT}\n\n---\n\n${SECONDARY_PROMPT}`;
    }

    const batchPrompt = `${sectionPrompt}

REQUIRED TOP-LEVEL KEYS:
${requiredFields.map((f) => `- ${f}`).join("\n")}
${JSON_STRUCTURE_RULES}

Use locale: ${config.locale}. Make it challenging, believable, and completely IMMERSIVE.`;

    try {
      const response = await fetch(`${this.config.baseURL}chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: "user",
              content: batchPrompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: temperature
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
      const generatedContent = responseData.choices?.[0]?.message?.content;

      if (!generatedContent) {
        throw new Error("No content generated from OpenAI API");
      }

      const parsedContent = JSON.parse(generatedContent) as Record<
        string,
        unknown
      >;
      const safeParsedContent = Object.fromEntries(
        Object.entries(parsedContent).filter(
          ([k]) => k !== "__proto__" && k !== "constructor" && k !== "prototype"
        )
      ) as Record<string, unknown>;
      let finalContent = safeParsedContent;

      // Check if fields are nested
      const hasDirectFields = requiredFields.some((f) => safeParsedContent[f]);
      if (!hasDirectFields) {
        for (const key of Object.keys(safeParsedContent)) {
          const nestedValue = safeParsedContent[key];
          if (
            nestedValue &&
            typeof nestedValue === "object" &&
            nestedValue !== null
          ) {
            // Strip prototype-polluting keys before merging
            const safeNested = Object.fromEntries(
              Object.entries(nestedValue as Record<string, unknown>).filter(
                ([k]) => k !== "__proto__" && k !== "constructor" && k !== "prototype"
              )
            );
            finalContent = { ...finalContent, ...safeNested };
          }
        }
      }

      // Map specialized fields back to the standard return interface
      const validatedContent: GeneratedContent = {
        preBreachEmails: Array.isArray(finalContent.preBreachEmails)
          ? (finalContent.preBreachEmails as Email[])
          : [],
        breachEmails: Array.isArray(finalContent.breachEmails)
          ? (finalContent.breachEmails as Email[])
          : [],
        logEntries: Array.isArray(finalContent.logEntries)
          ? (finalContent.logEntries as LogEntry[])
          : [],
        lolbins: Array.isArray(finalContent.lolbins)
          ? (finalContent.lolbins as LOLBin[])
          : [],
        wifi: Array.isArray(finalContent.wifi)
          ? (finalContent.wifi as WiFiNetwork[])
          : [],
        expectedIOCs: Array.isArray(finalContent.expectedIOCs)
          ? (finalContent.expectedIOCs as unknown[])
          : [],
        sessionId: config.sessionId,
        isOfflineContent: false
      };

      return validatedContent;
    } catch (error: unknown) {
      console.error("[OpenAI API] Error:", error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseURL}models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// ─── Audit Client ──────────────────────────────────────────────────────

/**
 * Client for auditing generated content quality.
 * Uses a reasoning model to ensure technical accuracy.
 */
export class AuditClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "o3-pro") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async auditContent(
    type: string,
    content: unknown
  ): Promise<{ score: number; feedback: string }> {
    try {
      const prompt = `You are auditing content generated for a cybersecurity training simulation.
The target audience is skilled IT professionals. Content must be technically accurate and challenging.

Content type: ${type}
Content: ${JSON.stringify(content)}

AUDIT CRITERIA BY TYPE:

FOR EMAILS (EMAIL_PRE, EMAIL_BREACH):
- Legitimate emails (isPhishing=false): headers MUST all pass, no suspicious links, realistic corporate tone.
- Phishing emails (isPhishing=true): MUST use sophisticated 2024-2026 vectors (AiTM, session theft, Device Code Phishing, MFA fatigue). REJECT generic scams, obvious typos, or .exe attachments. MUST have at least one header failure or domain mismatch.
- "indicators" array must contain analyst-useful observations, not player-facing hints.
- Ratio check: breachEmails should be exactly 50% legitimate / 50% phishing.

FOR LOGS (LOG_BATCH):
- Logs MUST use accurate Windows Event IDs (4624, 4625, 4688, 7045) or cloud equivalents.
- If a log claims lateral movement but uses wrong Event ID or illogical port → CRITICAL FAIL.
- "message" must be a single readable string with Event IDs, IPs, and commands inline.
- Ratio check: MUST be approximately 70% legitimate / 30% malicious.
- Malicious logs must tell a coherent kill chain (recon → execution → persistence → lateral movement).

FOR LOLBINS (LOLBIN_BATCH):
- Malicious LOLBins must have realistic, specific command lines (not generic placeholders).
- processName must be a real Windows binary (certutil.exe, powershell.exe, mshta.exe, etc.).
- Legitimate processes must look genuinely normal (svchost.exe with valid flags, explorer.exe).
- Ratio check: MUST be approximately 50% legitimate / 50% malicious. If <40% legitimate → FAIL.

FOR WIFI (WIFI_BATCH):
- Must have exactly 1 evil twin with isEvilTwin=true.
- Evil twin must use WPA2-PSK (weaker) vs corporate 802.1X, and have stronger signal.
- authType must be exactly "WPA2-PSK", "802.1X", or "Open" — not free-form strings.
- Background networks should be realistic public/neighbor SSIDs.

SCORING (1-10):
1-3: CRITICAL FAIL — technically inaccurate (wrong Event IDs, broken ratios, generic phishing).
4-6: Accurate but basic — relies on legacy indicators or has minor ratio/format issues.
7-10: High-fidelity — accurate MITRE ATT&CK telemetry, sophisticated phishing vectors, correct ratios.

Return ONLY: { "score": number, "feedback": "string with specific issues found" }`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
          })
        }
      );

      if (!response.ok) return { score: 5, feedback: "Audit failed" };

      const responseData = await response.json();
      const generatedContent = responseData.choices?.[0]?.message?.content;
      if (!generatedContent)
        return { score: 5, feedback: "Audit failed - no content" };

      const result = JSON.parse(generatedContent) as {
        score?: number;
        feedback?: string;
      };
      return {
        score: Number(result.score) || 5,
        feedback: String(result.feedback) || ""
      };
    } catch (e: unknown) {
      console.error("Audit error:", e);
      return { score: 5, feedback: "Error during audit" };
    }
  }
}

export function createOpenAIClient(): OpenAIClient | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OpenAI API key not found, content generation disabled");
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.4";

  return new OpenAIClient({ apiKey, model });
}
