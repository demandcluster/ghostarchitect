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
    const teamName = "{{teamName}}";
    const fakeDomain = "{{fakeDomain}}";

    let sectionPrompt = "";
    let requiredFields: string[] = [];

    if (section === "initial") {
      requiredFields = ["preBreachEmails", "dmIntro", "dmScenarios"];
      sectionPrompt = `ACT AS A PROFESSIONAL CORPORATE ROLEPLAY SCRIPTWRITER.
The target audience is CYBERSECURITY PROFESSIONALS.
IMPORTANT: Use the placeholder "${teamName}" for the company name and "${fakeDomain}" for the domain.

CRITICAL ROLEPLAY RULES:
1. DIALOGUE MUST BE CONVERSATIONAL. Characters use technical terms NATURALLY.
2. NO clinical naming (e.g., AVOID "Alice.SmithManager"). Use realistic names.
3. "CORRECT" ANSWERS MUST ALWAYS REDIRECT TO SECURE PROTOCOL (Vault, IAM, Ticket).
4. "INCORRECT" ANSWERS: Should include reckless sharing and passive/unhelpful actions.

INITIAL CONTENT FOCUS (ONBOARDING PHASE):
- preBreachEmails (EXACTLY 4-6 high-fidelity legitimate internal emails. MUST use ${fakeDomain}).
- dmIntro (EXACTLY 1 welcome message from a technical director).
- dmScenarios (EXACTLY 6-8 INDEPENDENT scenarios. 50% MUST be LEGITIMATE technical peer requests, 50% MUST be SOCIAL ENGINEERING threats).

SCENARIO STRUCTURE:
Each scenario in 'dmScenarios' MUST be an object:
{
  "id": "scenario-unique-id",
  "setup": { "id": "s-setup", "sender": "Name", "senderRole": "Role", "avatar": "URL", "text": "...", "choices": [...] },
  "onPass": { "id": "s-pass", "sender": "Name", "senderRole": "Role", "avatar": "URL", "text": "Technical feedback for correct choice" },
  "onFail": { "id": "s-fail", "sender": "Name", "senderRole": "Role", "avatar": "URL", "text": "Technical feedback for incorrect choice" }
}`;
    } else if (section === "secondary") {
      requiredFields = ["breachEmails", "logEntries", "npcBadAdvice", "lolbins", "wifi"];
      sectionPrompt = `ACT AS A SENIOR SYSTEM ADMINISTRATOR AND NARRATOR.
The target audience is CYBERSECURITY PROFESSIONALS.
Use placeholders "${teamName}" and "${fakeDomain}".

SECONDARY CONTENT FOCUS (BREACH & INVESTIGATION):
- breachEmails (EXACTLY 6-8 emails. Mix of real alerts and sophisticated phishing).
- logEntries (EXACTLY 25-30 system logs. Technical and realistic).
- npcBadAdvice (EXACTLY 4-6 dialogues from technical peers giving urgent but wrong advice).
- lolbins (EXACTLY 8-12 realistic processes).
- wifi (EXACTLY 5-8 networks).

TECHNICAL LOG DEPTH:
Logs must show a multi-stage attack chain: Recon -> Exploit -> Persistence -> Lateral Movement.`;
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
      sectionPrompt = `ACT AS A SENIOR CYBERSECURITY ROLEPLAY SCRIPTWRITER. 
Generate ALL immersive content using placeholders "${teamName}" and "${fakeDomain}".
Target audience: CYBERSECURITY PROFESSIONALS.
Follow all SCENARIO STRUCTURE and COMPLIANCE rules for every section.`;
    }

    // Create a comprehensive prompt for batch generation with explicit structure
    const batchPrompt = `${sectionPrompt} 

IMPORTANT: Return ONLY a JSON object with THESE EXACT top-level keys:
${requiredFields.map((f) => `- ${f}`).join("\n")}

MANDATORY DATA RULES:
1. Every object in EVERY array (emails, logEntries, lolbins, wifi, etc.) MUST have a unique "id" field.
2. For emails, use IDs like "gen-email-1", "gen-email-2", etc.
3. For logs, use IDs like "gen-log-1", "gen-log-2", etc.

DM CHOICE JSON STRUCTURE (MANDATORY):
"choices": [
  { "id": "c1", "label": "Technical redirection to secure protocol (Vault/IAM/Ticket)", "isCorrect": true, "nextMessageId": "ON_PASS_ID" },
  { "id": "c2", "label": "Reckless sharing/Dangerous shortcut", "isCorrect": false, "nextMessageId": "ON_FAIL_ID" },
  { "id": "c3", "label": "Passive/Unhelpful action (e.g. Ignoring)", "isCorrect": false, "nextMessageId": "ON_FAIL_ID" }
]
* Note: Use literal "ON_PASS_ID" and "ON_FAIL_ID" in the prompt; the manager will fix these during pool hydration.

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
        preBreachEmails: Array.isArray(finalContent.preBreachEmails) ? finalContent.preBreachEmails : [],
        breachEmails: Array.isArray(finalContent.breachEmails) ? finalContent.breachEmails : [],
        logEntries: Array.isArray(finalContent.logEntries) ? finalContent.logEntries : [],
        // Temporary storage for pool hydration:
        socialEngineeringDMs: [
          ...(finalContent.dmIntro ? [finalContent.dmIntro] : []),
          ...(Array.isArray(finalContent.dmScenarios) ? finalContent.dmScenarios : [])
        ] as any[], 
        npcBadAdvice: Array.isArray(finalContent.npcBadAdvice) ? finalContent.npcBadAdvice : [],
        lolbins: Array.isArray(finalContent.lolbins) ? finalContent.lolbins : [],
        wifi: Array.isArray(finalContent.wifi) ? finalContent.wifi : [],
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

  async auditContent(type: string, content: any): Promise<{ score: number; feedback: string }> {
    try {
      const prompt = `AUDIT this cybersecurity game content for a professional audience.
Type: ${type}
Content: ${JSON.stringify(content)}

CRITICAL COMPLIANCE & STANDARDS CHECK:
1. PEDAGOGICAL INTEGRITY: Evaluate the "Possible Choices" provided in the content.
   - MANDATORY: If a choice marked 'isCorrect: true' involves sharing secrets or bypasses technical controls, REJECT IMMEDIATELY.
   - MANDATORY: If a choice marked 'isCorrect: true' involves redirecting to official secure protocol, APPROVE.
2. ROLEPLAY CONTEXT (NPC_ADVICE): For this type, the NPC character text SHOULD be technically incorrect or urgent/misleading. Do NOT reject the item because the character is wrong. ONLY reject if the 'isCorrect: true' metadata is assigned to an unwise or dangerous response to that character.
3. CHAIN INTEGRITY: For DM_SCENARIO, verify that 'onPass' logic matches the safe choice and 'onFail' logic matches the dangerous choices.
4. QUALITY: Is the roleplay immersive and conversational? (No "Alice.SmithManager" style names).

SCORING (1-10):
- 1-3: CRITICAL FAIL (e.g., isCorrect flag assigned to a dangerous action, or broken scenario logic). REJECT.
- 4-6: Accurate but simple.
- 7-10: High-fidelity technical reinforcement with realistic professional dialogue.

Return ONLY a JSON object: { "score": number, "feedback": "string" }`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
      });

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
