export interface ZhipuAIConfig {
  apiKey: string;
  model: 'glm-4' | 'glm-4-plus';
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

export class ZhipuAIClient {
  private config: ZhipuAIConfig;

  constructor(config: ZhipuAIConfig) {
    this.config = {
      baseURL: config.baseURL || 'https://open.bigmodel.cn/api/paas/v4/',
      ...config
    };
  }

  async generateContent(prompt: string, options?: GenerationOptions): Promise<string> {
    const response = await fetch(`${this.config.baseURL}chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.9,
        max_tokens: options?.maxTokens ?? 4000,
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

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async generateBatch(prompts: string[], options?: GenerationOptions): Promise<string[]> {
    // For now, process sequentially
    // Can optimize to parallel requests in Phase 2
    const results: string[] = [];
    for (const prompt of prompts) {
      const result = await this.generateContent(prompt, options);
      results.push(result);
    }
    return results;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseURL}models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export function createZhipuAIClient(): ZhipuAIClient | null {
  const apiKey = process.env.NEXT_PUBLIC_ZHIPU_API_KEY;
  if (!apiKey) {
    console.warn('Zhipu AI API key not found, content generation disabled');
    return null;
  }

  const model = (process.env.NEXT_PUBLIC_ZHIPU_MODEL as 'glm-4' | 'glm-4-plus') || 'glm-4';

  return new ZhipuAIClient({ apiKey, model });
}
