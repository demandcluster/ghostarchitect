import type {
  Email,
  LogEntry,
  DMMessage,
  LOLBin,
  WiFiNetwork
} from "@/content/types";

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

export class OpenAIClient {
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = {
      baseURL: config.baseURL || "https://api.openai.com/v1/",
      model: config.model || "gpt-4o-mini",
      ...config
    };
  }

  async generateBatch(config: BatchGenerationConfig): Promise<{
    preBreachEmails: Email[];
    breachEmails: Email[];
    logEntries: LogEntry[];
    socialEngineeringDMs: DMMessage[]; // This will now hold individual scenario units for the pool
    npcBadAdvice: DMMessage[];
    lolbins: LOLBin[];
    wifi: WiFiNetwork[];
    sessionId: string;
    isOfflineContent: boolean;
  }> {
    const temperature = config.temperature ?? 0.9;
    const section = config.section ?? "all";

    // For pool generation, we use placeholders instead of specific team data
    const teamName = "[teamName]";
    const fakeDomain = "[fakeDomain]";
    const playerHandle = "[playerHandle]";

    let sectionPrompt = "";
    let requiredFields: string[] = [];

    if (section === "initial") {
      requiredFields = [
        "preBreachEmails",
        "breachEmails",
        "dmIntro",
        "dmScenarios"
      ];
      sectionPrompt = `ACT AS A SENIOR CYBERSECURITY GRC & THREAT INTELLIGENCE ARCHITECT.
The target audience consists of highly skilled CYBERSECURITY PROFESSIONALS.
IMPORTANT: Use these EXACT placeholders:
- "[teamName]" for the company name
- "[fakeDomain]" for the corporate domain
- "[playerHandle]" for the user's name
- "[phishing-link]" for malicious payloads

CRITICAL ROLEPLAY & TECHNICAL RULES:
1. DIALOGUE MUST BE HIGH-FIDELITY. Characters use accurate 2026 terminology (e.g., AiTM, session tokens, EDR telemetry, IAM conditional access, ZTNA).
2. "CORRECT" ANSWERS MUST ALIGN WITH ISO 27001:2022 AND NIS2/GDPR. Correct choices must involve formal Incident Response (A.5.24), Event Reporting (A.6.8), Log Monitoring (A.8.16), or escalating to the CSIRT/NCSC within mandatory 24-72 hour regulatory windows.
3. "INCORRECT" ANSWERS MUST REPRESENT DANGEROUS SHORTCUTS. These include unauthorized active defense (hack back), resetting passwords without revoking session tokens (which is ineffective against AiTM), or attempting to cover up breaches to avoid regulatory fines.

INITIAL CONTENT FOCUS (ONBOARDING & BREACH EMAILS):
- preBreachEmails (EXACTLY 4-6 high-fidelity legitimate emails. Must reflect modern corporate workflows, e.g., Azure AD conditional access policy updates, or ISO 27001 audit preparation).
- breachEmails (EXACTLY 6-8 emails. MANDATORY: 50% LEGITIMATE, 50% SOPHISTICATED PHISHING).

2026 PEDAGOGICAL PHISHING RULES (MANDATORY):
- LEGITIMATE EMAILS: MUST have passing SPF/DKIM/DMARC headers. No malicious links.
- PHISHING EMAILS: MUST reflect Adversary-in-the-Middle (AiTM), Evilginx, or Device Code Phishing. Lures MUST impersonate legitimate infrastructure (e.g., a shared document hosted on an attacker-controlled SharePoint tenant or a fake Microsoft Authentication Broker) designed to steal session cookies and bypass legacy MFA. MUST include at least one header failure or domain spoofing artifact. DO NOT use obvious typos or generic malware attachments.

DM SCENARIOS (EXACTLY 6-8 INDEPENDENT SCENARIOS):
- 50% Legitimate peer requests requiring strict adherence to access control policies (ISO 27001 A.9.2) and least privilege.
- 50% Social Engineering. Attackers use sophisticated tactics like deepfakes, Helpdesk impersonation to reset MFA tokens, or MFA Fatigue (push bombing).

SCENARIO STRUCTURE:
{
  "setup": { "id": "s-setup", "sender": "Name", "senderRole": "Role", "avatar": "Initials", "text": "...", "choices": [...] },
  "onPass": { "id": "s-pass", "sender": "Name", "senderRole": "Role", "avatar": "Initials", "text": "Technical validation of the correct ISO 27001/Regulatory response." },
  "onFail": { "id": "s-fail", "sender": "Name", "senderRole": "Role", "avatar": "Initials", "text": "Severe technical and regulatory consequence of the incorrect action." }
}`;
    } else if (section === "secondary") {
      requiredFields = ["logEntries", "expectedIOCs", "npcBadAdvice", "lolbins", "wifi"];
      sectionPrompt = `ACT AS A SENIOR SOC ANALYST AND DIGITAL FORENSICS EXPERT.
The target audience is CYBERSECURITY PROFESSIONALS conducting advanced log analysis.
Use placeholders "${teamName}" and "${fakeDomain}".

SECONDARY CONTENT FOCUS (INVESTIGATION):
- logEntries (EXACTLY 25-30 logs. MANDATORY: 70% LEGITIMATE traffic, 30% MALICIOUS attack indicators).
- expectedIOCs (EXACTLY 6 specific strings found in the malicious logs: IP addresses, file paths, or tokens. MUST be an array of {type, value, hint}).
- npcBadAdvice (EXACTLY 4-6 dialogues).
- lolbins (EXACTLY 8-12 processes. MANDATORY: 50% LEGITIMATE usage, 50% MALICIOUS exploitation).
- wifi (EXACTLY 5-8 networks. MANDATORY: 60% CORPORATE/HOME, 40% EVIL TWIN/SUSPICIOUS).

TECHNICAL LOG DEPTH & KILL CHAIN (MANDATORY):
Logs MUST follow a coherent MITRE ATT&CK kill chain, utilizing precise SIEM artifacts:
1. Recon/Initial Access: Azure AD sign-in anomalies indicating AiTM token theft (e.g., successful MFA followed by impossible travel or residential proxy IPs).
2. Execution: Malicious LOLBin usage. MUST include specific Windows Event IDs (e.g., Event ID 4688 for process creation, showing 'powershell.exe' or 'certutil.exe' executing obfuscated command lines).
3. Persistence: Windows Event ID 7045 (Service Installation) with binary paths pointing to user-writable directories, or Event ID 4672 anomalies.
4. Lateral Movement: Windows Event ID 4624 (Network Logon Type 3) moving from a workstation to a Domain Controller, or AWS CloudTrail 'AssumeRole' API calls.
Ensure the JSON output for logs includes specific keys for 'timestamp', 'eventID', 'source', 'destination', 'processName', and 'commandLine'.

IOC EXTRACTION (MANDATORY):
The 'expectedIOCs' array must correspond EXACTLY to the 'logEntries' generated. If a log shows an SSH brute force from 1.2.3.4, then an IOC of type "Attacker IP" with value "1.2.3.4" must exist.

HACKLORE & NPC BAD ADVICE (MANDATORY):
The 'npcBadAdvice' array MUST test the player's ability to reject outdated, fear-based cybersecurity myths ("Hacklore"). 
NPCs must urgently demand obsolete practices such as:
- Forcing arbitrary 30/90-day password rotations instead of deploying FIDO2 phishing-resistant MFA.
- Panicking over "juice jacking" at airport USB ports instead of checking EDR telemetry.
- Believing that clearing browser cookies prevents modern malware execution.
The correct player choice in these scenarios must dismiss the Hacklore and redirect the focus toward evidence-based, identity-centric defense strategies.`;
    } else {
      requiredFields = [
        "preBreachEmails",
        "breachEmails",
        "logEntries",
        "dmIntro",
        "dmScenarios",
        "npcBadAdvice",
        "lolbins",
        "wifi"
      ];

      const initialPrompt = `ACT AS A SENIOR CYBERSECURITY GRC & THREAT INTELLIGENCE ARCHITECT.
The target audience consists of highly skilled CYBERSECURITY PROFESSIONALS.
IMPORTANT: Use these EXACT placeholders:
- "[teamName]" for the company name
- "[fakeDomain]" for the corporate domain
- "[playerHandle]" for the user's name
- "[phishing-link]" for malicious payloads

CRITICAL ROLEPLAY & TECHNICAL RULES:
1. DIALOGUE MUST BE HIGH-FIDELITY. Characters use accurate 2026 terminology (e.g., AiTM, session tokens, EDR telemetry, IAM conditional access, ZTNA).
2. "CORRECT" ANSWERS MUST ALIGN WITH ISO 27001:2022 AND NIS2/GDPR. Correct choices must involve formal Incident Response (A.5.24), Event Reporting (A.6.8), Log Monitoring (A.8.16), or escalating to the CSIRT/NCSC within mandatory 24-72 hour regulatory windows.
3. "INCORRECT" ANSWERS MUST REPRESENT DANGEROUS SHORTCUTS. These include unauthorized active defense (hack back), resetting passwords without revoking session tokens (which is ineffective against AiTM), or attempting to cover up breaches to avoid regulatory fines.

INITIAL CONTENT FOCUS (ONBOARDING & BREACH EMAILS):
- preBreachEmails (EXACTLY 4-6 high-fidelity legitimate emails. Must reflect modern corporate workflows, e.g., Azure AD conditional access policy updates, or ISO 27001 audit preparation).
- breachEmails (EXACTLY 6-8 emails. MANDATORY: 50% LEGITIMATE, 50% SOPHISTICATED PHISHING).

2026 PEDAGOGICAL PHISHING RULES (MANDATORY):
- LEGITIMATE EMAILS: MUST have passing SPF/DKIM/DMARC headers. No malicious links.
- PHISHING EMAILS: MUST reflect Adversary-in-the-Middle (AiTM), Evilginx, or Device Code Phishing. Lures MUST impersonate legitimate infrastructure (e.g., a shared document hosted on an attacker-controlled SharePoint tenant or a fake Microsoft Authentication Broker) designed to steal session cookies and bypass legacy MFA. MUST include at least one header failure or domain spoofing artifact. DO NOT use obvious typos or generic malware attachments.

DM SCENARIOS (EXACTLY 6-8 INDEPENDENT SCENARIOS):
- 50% Legitimate peer requests requiring strict adherence to access control policies (ISO 27001 A.9.2) and least privilege.
- 50% Social Engineering. Attackers use sophisticated tactics like deepfakes, Helpdesk impersonation to reset MFA tokens, or MFA Fatigue (push bombing).

SCENARIO STRUCTURE:
{
  "setup": { "id": "s-setup", "sender": "Name", "senderRole": "Role", "avatar": "Initials", "text": "...", "choices": [...] },
  "onPass": { "id": "s-pass", "sender": "Name", "senderRole": "Role", "avatar": "Initials", "text": "Technical validation of the correct ISO 27001/Regulatory response." },
  "onFail": { "id": "s-fail", "sender": "Name", "senderRole": "Role", "avatar": "Initials", "text": "Severe technical and regulatory consequence of the incorrect action." }
}`;

      const secondaryPrompt = `ACT AS A SENIOR SOC ANALYST AND DIGITAL FORENSICS EXPERT.
The target audience is CYBERSECURITY PROFESSIONALS conducting advanced log analysis.
Use placeholders "${teamName}" and "${fakeDomain}".

SECONDARY CONTENT FOCUS (INVESTIGATION):
- logEntries (EXACTLY 25-30 logs. MANDATORY: 70% LEGITIMATE traffic, 30% MALICIOUS attack indicators).
- npcBadAdvice (EXACTLY 4-6 dialogues).
- lolbins (EXACTLY 8-12 processes. MANDATORY: 50% LEGITIMATE usage, 50% MALICIOUS exploitation).
- wifi (EXACTLY 5-8 networks).

TECHNICAL LOG DEPTH & KILL CHAIN (MANDATORY):
Logs MUST follow a coherent MITRE ATT&CK kill chain, utilizing precise SIEM artifacts:
1. Recon/Initial Access: Azure AD sign-in anomalies indicating AiTM token theft (e.g., successful MFA followed by impossible travel or residential proxy IPs).
2. Execution: Malicious LOLBin usage. MUST include specific Windows Event IDs (e.g., Event ID 4688 for process creation, showing 'powershell.exe' or 'certutil.exe' executing obfuscated command lines).
3. Persistence: Windows Event ID 7045 (Service Installation) with binary paths pointing to user-writable directories, or Event ID 4672 anomalies.
4. Lateral Movement: Windows Event ID 4624 (Network Logon Type 3) moving from a workstation to a Domain Controller, or AWS CloudTrail 'AssumeRole' API calls.
Ensure the JSON output for logs includes specific keys for 'timestamp', 'eventID', 'source', 'destination', 'processName', and 'commandLine'.

HACKLORE & NPC BAD ADVICE (MANDATORY):
The 'npcBadAdvice' array MUST test the player's ability to reject outdated, fear-based cybersecurity myths ("Hacklore"). 
NPCs must urgently demand obsolete practices such as:
- Forcing arbitrary 30/90-day password rotations instead of deploying FIDO2 phishing-resistant MFA.
- Panicking over "juice jacking" at airport USB ports instead of checking EDR telemetry.
- Believing that clearing browser cookies prevents modern malware execution.
The correct player choice in these scenarios must dismiss the Hacklore and redirect the focus toward evidence-based, identity-centric defense strategies.`;

      sectionPrompt = `${initialPrompt}\n\n---\n\n${secondaryPrompt}`;
    }

    // Create a comprehensive prompt for batch generation with explicit structure
    const batchPrompt = `${sectionPrompt} 

IMPORTANT: Return ONLY a JSON object with THESE EXACT top-level keys:
${requiredFields.map((f) => `- ${f}`).join("\n")}

MANDATORY DATA RULES:
1. Every object in EVERY array (emails, logEntries, lolbins, wifi, etc.) MUST have a unique "id" field.
2. For emails, use IDs like "gen-email-1", "gen-email-2", etc.
3. For logs, use IDs like "gen-log-1", "gen-log-2", etc.

EMAIL JSON STRUCTURE (MANDATORY):
Each email MUST have:
{
  "id": "...",
  "from": "...",
  "to": "...",
  "subject": "...",
  "date": "YYYY-MM-DD HH:mm",
  "body": "...",
  "isPhishing": true/false,
  "indicators": ["indicator 1", ...],
  "difficulty": "easy/medium/hard",
  "headers": {
    "returnPath": "<sender@domain.com>",
    "spf": "pass" or "fail",
    "dkim": "pass" or "fail",
    "dmarc": "pass" or "fail"
  }
}
* IMPORTANT: Headers MUST NOT be empty strings. Use "pass" or "fail" explicitly.

DM CHOICE JSON STRUCTURE (MANDATORY):
"choices": [
  { "id": "c1", "label": "Technical redirection to secure protocol (Vault/IAM/Ticket)", "isCorrect": true, "nextMessageId": "ON_PASS_ID" },
  { "id": "c2", "label": "Reckless sharing/Dangerous shortcut", "isCorrect": false, "nextMessageId": "ON_FAIL_ID" },
  { "id": "c3", "label": "Passive/Unhelpful action (e.g. Ignoring)", "isCorrect": false, "nextMessageId": "ON_FAIL_ID" }
]
* Note: Use literal "ON_PASS_ID" and "ON_FAIL_ID" in the prompt; the manager will fix these during pool hydration.
** Choices must be presented as actual answers to the message. The examples above are content hint not style hints.

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

      const parsedContent = JSON.parse(generatedContent) as any;
      let finalContent = parsedContent;

      // Check if fields are nested
      const hasDirectFields = requiredFields.some((f) => parsedContent[f]);
      if (!hasDirectFields) {
        for (const key of Object.keys(parsedContent)) {
          const nestedValue = parsedContent[key];
          if (nestedValue && typeof nestedValue === "object") {
            finalContent = { ...finalContent, ...nestedValue };
          }
        }
      }

      // Map specialized fields back to the standard return interface
      const validatedContent = {
        preBreachEmails: Array.isArray(finalContent.preBreachEmails)
          ? finalContent.preBreachEmails
          : [],
        breachEmails: Array.isArray(finalContent.breachEmails)
          ? finalContent.breachEmails
          : [],
        logEntries: Array.isArray(finalContent.logEntries)
          ? finalContent.logEntries
          : [],
        // Temporary storage for pool hydration:
        socialEngineeringDMs: [
          ...(finalContent.dmIntro ? [finalContent.dmIntro] : []),
          ...(Array.isArray(finalContent.dmScenarios)
            ? finalContent.dmScenarios
            : [])
        ] as any[],
        npcBadAdvice: Array.isArray(finalContent.npcBadAdvice)
          ? finalContent.npcBadAdvice
          : [],
        lolbins: Array.isArray(finalContent.lolbins)
          ? finalContent.lolbins
          : [],
        wifi: Array.isArray(finalContent.wifi) ? finalContent.wifi : [],
        expectedIOCs: Array.isArray(finalContent.expectedIOCs) ? finalContent.expectedIOCs : [],
        sessionId: config.sessionId,
        isOfflineContent: false
      };

      return validatedContent;
    } catch (error: any) {
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

/**
 * Client for auditing generated content quality.
 * Uses a more powerful model to ensure technical accuracy and roleplay fidelity.
 */
export class AuditClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-4o") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async auditContent(
    type: string,
    content: any
  ): Promise<{ score: number; feedback: string }> {
    try {
      const prompt = `AUDIT this cybersecurity game content for an advanced professional audience.
Type: ${type}
Content: ${JSON.stringify(content)}

CRITICAL COMPLIANCE & 2026 STANDARDS CHECK:
1. ADVANCED THREAT FIDELITY (EMAILS):
   - IF isPhishing is FALSE: Content MUST NOT have suspicious links and headers MUST pass.
   - IF isPhishing is TRUE: Reject generic "Nigerian prince" scams, obvious typos, or generic '.exe' attachments. APPROVE sophisticated 2026 vectors (e.g., AiTM, session cookie theft, Device Code Phishing, MFA fatigue, abused SharePoint infrastructure).
2. INCIDENT RESPONSE INTEGRITY (DMs):
   - "isCorrect: true" choices MUST align with formal ISO 27001:2022 controls (e.g., A.5.24 Incident Management, A.8.16 Monitoring) and regulatory realism (e.g., NIS2 24-hour early warning, GDPR 72-hour reporting windows).
   - REJECT any "correct" choice that relies on outdated "Hacklore" or suggests that merely resetting a password without revoking session tokens will stop an AiTM attack.
3. TELEMETRIC ACCURACY (LOGS & LOLBINS):
   - Logs MUST utilize realistic, accurate artifacts (e.g., Windows Event IDs 4624, 4625, 4688, 7045 or AWS CloudTrail). If a log claims to show lateral movement but uses an incorrect Event ID or illogical port, score a CRITICAL FAIL.
4. HACKLORE IDENTIFICATION (NPC_ADVICE):
   - The NPC dialogue MUST represent a pervasive cybersecurity myth (e.g., juice jacking, frequent password expiration). The scenario is only valid if the 'isCorrect: true' choice actively debunks the myth and redirects to a data-driven practice.

SCORING (1-10):
- 1-3: CRITICAL FAIL (e.g., technically inaccurate Event IDs, suggests password resets stop session hijacking, or "correct" action violates ISO 27001/NIS2 timelines). REJECT.
- 4-6: Accurate but overly basic (relies on legacy phishing indicators or generic IT advice).
- 7-10: High-fidelity. Exhibits deep understanding of AiTM, MITRE ATT&CK, precise SIEM telemetry, and modern European regulatory frameworks.

Return ONLY a JSON object: { "score": number, "feedback": "string" }`;

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

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      return {
        score: Number(result.score) || 5,
        feedback: String(result.feedback) || ""
      };
    } catch (e) {
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

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  return new OpenAIClient({ apiKey, model });
}
