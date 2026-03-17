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

export class OpenAIClient {
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = {
      baseURL: config.baseURL || "https://api.openai.com/v1/",
      model: config.model || "gpt-3.5-turbo",
      ...config
    };
  }

  async generateBatch(config: BatchGenerationConfig): Promise<{
    preBreachEmails: Email[];
    breachEmails: Email[];
    logEntries: LogEntry[];
    socialEngineeringDMs: DMMessage[];
    npcBadAdvice: DMMessage[];
    lolbins: LOLBin[];
    wifi: WiFiNetwork[];
    sessionId: string;
    isOfflineContent: boolean;
  }> {
    const temperature = config.temperature ?? 0.9;

    // Create a comprehensive prompt for batch generation with explicit structure
    const batchPrompt = `Generate all content for a cybersecurity training scenario. Make it challenging.

IMPORTANT: Return ONLY a JSON object with these exact top-level keys:
- preBreachEmails (array of email objects with id, from, to, subject, date, body, headers object, isPhishing, indicators array, difficulty string)
- breachEmails (array of email objects with same structure)
- logEntries (array of log objects with id, timestamp, level enum, source, message, isMalicious, attackTechnique, mitreId)
- socialEngineeringDMs (array of 6-10 DM objects with id, sender, senderRole, avatar (URL pattern: https://api.dicebear.com/9.x/initials/svg?seed={sender_name} where {sender_name} is replaced with actual sender name from responses), text, timestamp, choices array)
- npcBadAdvice (array of 6-10 DM objects with same structure, with avatar using same URL pattern with sender name)
- lolbins (array of process objects with id, processName, pid, commandLine, isMalicious, description, mitreId)
- wifi (array of WiFi objects with ssid, bssid, signalStrength, authType enum, isEvilTwin, indicators array)

DM MESSAGE STRUCTURE RULES:
1. Each DM message can have EITHER a choices array OR no choices (informational/follow-up message)
2. Messages WITH choices must have at least 3 choices. Each choice needs: id, label, isCorrect, nextMessageId
3. Messages WITHOUT choices are follow-up/feedback messages (no user response needed)
4. Use nextMessageId in choices to chain to follow-up messages
5. Include both correct (safe) and incorrect (dangerous) choices
6. Not all messages need choices - include informational messages and follow-up responses
7. Timestamps control reveal order: use -1 for initial welcome, 0+ for subsequent, same timestamp = revealed together
8. For correct choices, the nextMessageId should point to a positive feedback message
9. For incorrect choices, the nextMessageId should point to a warning/correction message

MESSAGE FLOW EXAMPLE:
- Message A (timestamp 0) with choices, each choice has nextMessageId pointing to B or C
- Message B (timestamp 1) - positive feedback after correct choice
- Message C (timestamp 1) - warning after incorrect choice
- Message D (timestamp 2) - next scenario message with choices

IMPORTANT: For avatar URLs, use the format pattern: https://api.dicebear.com/9.x/initials/svg?seed={sender_name} where {sender_name} will be replaced with the actual sender name from the response.

Use locale: ${config.locale}. Generate realistic, educational content. Ensure DM messages include a mix of legitimate security advice (correct choices available), malicious social engineering attempts (trap choices), and follow-up feedback messages. Not all messages should have choices - include helpful guidance and feedback messages.`;

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

      console.log("[OpenAI API] Request body:", {
        model: this.config.model,
        temperature: temperature,
        responseType: "json_object"
      });

      if (!response.ok) {
        const error: GenerationError = {
          message: response.statusText,
          statusCode: response.status,
          isRetryable: response.status === 429 || response.status >= 500
        };
        console.error("[OpenAI API] Request failed:", {
          status: response.status,
          statusText: response.statusText
        });
        throw error;
      }

      const responseData = await response.json();

      console.log("[OpenAI API] Response received:", {
        hasChoices: !!responseData.choices?.[0],
        hasContent: !!responseData.choices?.[0]?.message?.content,
        responseLength: JSON.stringify(responseData).length
      });

      // Parse the OpenAI response
      const generatedContent = responseData.choices[0]?.message?.content;

      if (!generatedContent) {
        console.error("[OpenAI API] No content generated");
        throw new Error("No content generated from OpenAI API");
      }

      // Debug: Log first 500 chars of generated content
      console.log(
        "[OpenAI API] Generated content preview:",
        generatedContent.substring(0, 500)
      );

      // Parse JSON response
      const parsedContent = JSON.parse(generatedContent) as any;

      console.log(
        "[OpenAI API] Parsed content keys:",
        Object.keys(parsedContent)
      );

      // Check if our expected fields are directly in the response
      const hasDirectFields =
        parsedContent.preBreachEmails ||
        parsedContent.breachEmails ||
        parsedContent.logEntries ||
        parsedContent.socialEngineeringDMs ||
        parsedContent.npcBadAdvice ||
        parsedContent.lolbins ||
        parsedContent.wifi;

      // If not, try to find fields in a nested structure
      let finalContent = parsedContent;

      if (!hasDirectFields) {
        console.log(
          "[OpenAI API] Direct fields not found, checking nested structure"
        );
        // Try to find our fields in nested structures
        for (const key of Object.keys(parsedContent)) {
          const nestedValue = parsedContent[key];
          if (nestedValue && typeof nestedValue === "object") {
            console.log(
              `[OpenAI API] Found nested key ${key} with:`,
              Object.keys(nestedValue)
            );
            finalContent = { ...finalContent, ...nestedValue };
          }
        }
      }
      console.log(
        "[OpenAI API] Final content keys:",
        Object.keys(finalContent)
      );
      // Check again after merging
      const hasAllFields =
        finalContent.preBreachEmails &&
        finalContent.breachEmails &&
        finalContent.logEntries &&
        finalContent.socialEngineeringDMs &&
        finalContent.npcBadAdvice &&
        finalContent.lolbins &&
        finalContent.wifi;

      if (!hasAllFields) {
        console.error(
          "[OpenAI API] Still missing required fields after checking nested structure"
        );
        throw new Error(
          "Invalid content structure from OpenAI API - missing required fields"
        );
      }

      // Ensure all fields are arrays, default to empty arrays if not present
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
        socialEngineeringDMs: Array.isArray(finalContent.socialEngineeringDMs)
          ? finalContent.socialEngineeringDMs
          : [],
        npcBadAdvice: Array.isArray(finalContent.npcBadAdvice)
          ? finalContent.npcBadAdvice
          : [],
        lolbins: Array.isArray(finalContent.lolbins)
          ? finalContent.lolbins
          : [],
        wifi: Array.isArray(finalContent.wifi) ? finalContent.wifi : [],
        sessionId: config.sessionId,
        isOfflineContent: false
      };

      console.log("[OpenAI API] Validated content structure:", {
        preBreachEmails: validatedContent.preBreachEmails.length,
        breachEmails: validatedContent.breachEmails.length,
        logEntries: validatedContent.logEntries.length,
        socialEngineeringDMs: validatedContent.socialEngineeringDMs.length,
        npcBadAdvice: validatedContent.npcBadAdvice.length,
        lolbins: validatedContent.lolbins.length,
        wifi: validatedContent.wifi.length
      });

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

export function createOpenAIClient(): OpenAIClient | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OpenAI API key not found, content generation disabled");
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

  return new OpenAIClient({ apiKey, model });
}
