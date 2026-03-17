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
    const batchPrompt = `Generate all content for a cybersecurity training scenario in a single response.`;

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
          temperature: temperature,
          response_mime_type: "application/json",
          response_json_schema: this.getJsonSchema()
        }
      })
    });

    console.log('[Gemini API] Request body:', {
      model: this.config.model,
      temperature: temperature,
      hasJsonSchema: true
    });

    if (!response.ok) {
      const error: GenerationError = {
        message: response.statusText,
        statusCode: response.status,
        isRetryable: response.status === 429 || response.status >= 500
      };
      console.error('[Gemini API] Request failed:', {
        status: response.status,
        statusText: response.statusText
      });
      throw error;
    }

    const responseData = await response.json();

    console.log('[Gemini API] Response received:', {
      hasCandidates: !!responseData.candidates?.[0],
      hasContent: !!responseData.candidates?.[0]?.content?.parts?.[0]?.text,
      responseLength: JSON.stringify(responseData).length
    });

    // Parse the Gemini response
    const generatedContent = responseData.candidates[0]?.content?.parts?.[0]?.text;

    if (!generatedContent) {
      console.error('[Gemini API] No content generated');
      throw new Error('No content generated from Gemini API');
    }

    // Debug: Log first 500 chars of generated content
    console.log('[Gemini API] Generated content preview:', generatedContent.substring(0, 500));

    // The API should return valid JSON when using response_json_schema
    const parsedContent = JSON.parse(generatedContent) as any;
    parsedContent.sessionId = config.sessionId;
    parsedContent.isOfflineContent = false;

    return parsedContent;
  }

  // Define JSON Schema for structured output
  private getJsonSchema(): object {
    return {
      type: "object",
      properties: {
        preBreachEmails: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              from: { type: "string" },
              to: { type: "string" },
              subject: { type: "string" },
              date: { type: "string" },
              body: { type: "string" },
              headers: {
                type: "object",
                properties: {
                  returnPath: { type: "string" },
                  spf: { type: "string" },
                  dkim: { type: "string" },
                  dmarc: { type: "string" }
                }
              },
              isPhishing: { type: "boolean" },
              indicators: { type: "array", items: { type: "string" } },
              difficulty: { type: "string", enum: ["easy", "medium", "hard"] }
            }
          }
        },
        breachEmails: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              from: { type: "string" },
              to: { type: "string" },
              subject: { type: "string" },
              date: { type: "string" },
              body: { type: "string" },
              headers: {
                type: "object",
                properties: {
                  returnPath: { type: "string" },
                  spf: { type: "string" },
                  dkim: { type: "string" },
                  dmarc: { type: "string" }
                }
              },
              isPhishing: { type: "boolean" },
              indicators: { type: "array", items: { type: "string" } },
              difficulty: { type: "string", enum: ["easy", "medium", "hard"] }
            }
          }
        },
        logEntries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              timestamp: { type: "string" },
              level: { type: "string", enum: ["INFO", "WARN", "ERROR", "CRITICAL"] },
              source: { type: "string" },
              message: { type: "string" },
              isMalicious: { type: "boolean" },
              attackTechnique: { type: "string" },
              mitreId: { type: "string" }
            }
          }
        },
        socialEngineeringDMs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              sender: { type: "string" },
              senderRole: { type: "string" },
              avatar: { type: "string" },
              text: { type: "string" },
              timestamp: { type: "number" },
              choices: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    label: { type: "string" },
                    isCorrect: { type: "boolean" },
                    trustDelta: { type: "number" },
                    scoreEffect: { type: "number" },
                    nextMessageId: { type: "string" },
                    flag: { type: "string" }
                  }
                }
              }
            }
          }
        },
        npcBadAdvice: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              sender: { type: "string" },
              senderRole: { type: "string" },
              avatar: { type: "string" },
              text: { type: "string" },
              timestamp: { type: "number" },
              choices: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    label: { type: "string" },
                    isCorrect: { type: "boolean" },
                    trustDelta: { type: "number" },
                    scoreEffect: { type: "number" }
                  }
                }
              }
            }
          }
        },
        lolbins: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              processName: { type: "string" },
              pid: { type: "number" },
              commandLine: { type: "string" },
              isMalicious: { type: "boolean" },
              description: { type: "string" },
              mitreId: { type: "string" }
            }
          }
        },
        wifi: {
          type: "array",
          items: {
            type: "object",
            properties: {
              ssid: { type: "string" },
              bssid: { type: "string" },
              signalStrength: { type: "number" },
              authType: { type: "string", enum: ["WPA2-PSK", "802.1X", "Open"] },
              isEvilTwin: { type: "boolean" },
              indicators: { type: "array", items: { type: "string" } }
            }
          }
        }
      },
      required: ["preBreachEmails", "breachEmails", "logEntries", "socialEngineeringDMs", "npcBadAdvice", "lolbins", "wifi"]
    };
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
