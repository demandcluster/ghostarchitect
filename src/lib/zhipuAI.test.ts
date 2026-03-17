import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ZhipuAIClient, createZhipuAIClient, type ZhipuAIConfig } from './zhipuAI';

describe('ZhipuAIClient', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createZhipuAIClient', () => {
    it('initializes with API key from env', () => {
      process.env.NEXT_PUBLIC_ZHIPU_API_KEY = 'test-key';
      const client = createZhipuAIClient();
      expect(client).not.toBeNull();
      expect(client).toBeInstanceOf(ZhipuAIClient);
    });

    it('returns null when API key missing', () => {
      delete process.env.NEXT_PUBLIC_ZHIPU_API_KEY;
      const client = createZhipuAIClient();
      expect(client).toBeNull();
    });

    it('uses default model when not specified', () => {
      process.env.NEXT_PUBLIC_ZHIPU_API_KEY = 'test-key';
      const client = createZhipuAIClient();
      expect(client).not.toBeNull();
    });

    it('uses specified model from env', () => {
      process.env.NEXT_PUBLIC_ZHIPU_API_KEY = 'test-key';
      process.env.NEXT_PUBLIC_ZHIPU_MODEL = 'glm-4-plus';
      const client = createZhipuAIClient();
      expect(client).not.toBeNull();
    });
  });

  describe('ZhipuAIClient class', () => {
    it('constructs with custom baseURL', () => {
      const client = new ZhipuAIClient({
        apiKey: 'test-key',
        model: 'glm-4',
        baseURL: 'https://custom.url/'
      });
      expect(client).toBeInstanceOf(ZhipuAIClient);
    });

    it('uses default baseURL when not provided', () => {
      const client = new ZhipuAIClient({
        apiKey: 'test-key',
        model: 'glm-4'
      });
      expect(client).toBeInstanceOf(ZhipuAIClient);
    });
  });

  describe('generateContent', () => {
    it('throws retryable error on 429', async () => {
      const client = new ZhipuAIClient({ apiKey: 'test', model: 'glm-4' });
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        } as Response)
      ) as any;

      await expect(client.generateContent('test prompt')).rejects.toThrow();
      const error = await client.generateContent('test prompt').catch((e: any) => e);
      expect(error.isRetryable).toBe(true);
    });

    it('throws retryable error on 500', async () => {
      const client = new ZhipuAIClient({ apiKey: 'test', model: 'glm-4' });
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as Response)
      ) as any;

      await expect(client.generateContent('test prompt')).rejects.toThrow();
      const error = await client.generateContent('test prompt').catch((e: any) => e);
      expect(error.isRetryable).toBe(true);
    });

    it('throws non-retryable error on 401', async () => {
      const client = new ZhipuAIClient({ apiKey: 'test', model: 'glm-4' });
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized'
        } as Response)
      ) as any;

      await expect(client.generateContent('test prompt')).rejects.toThrow();
      const error = await client.generateContent('test prompt').catch((e: any) => e);
      expect(error.isRetryable).toBe(false);
    });

    it('parses successful response', async () => {
      const client = new ZhipuAIClient({ apiKey: 'test', model: 'glm-4' });
      const mockResponse = {
        choices: [{
          message: {
            content: 'Generated content'
          }
        }]
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        } as Response)
      ) as any;

      const result = await client.generateContent('test prompt');
      expect(result).toBe('Generated content');
    });

    it('sends correct request body', async () => {
      const client = new ZhipuAIClient({ apiKey: 'test-key', model: 'glm-4' });
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'test' } }]
          })
        } as Response)
      );

      global.fetch = mockFetch as any;

      await client.generateContent('test prompt', { temperature: 0.8, maxTokens: 2000 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-key'
          }),
          body: expect.stringContaining('"model":"glm-4"')
        })
      );
    });
  });

  describe('generateBatch', () => {
    it('processes multiple prompts sequentially', async () => {
      const client = new ZhipuAIClient({ apiKey: 'test', model: 'glm-4' });
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'test response' } }]
          })
        } as Response)
      );

      global.fetch = mockFetch as any;

      const prompts = ['prompt1', 'prompt2', 'prompt3'];
      const results = await client.generateBatch(prompts);

      expect(results).toHaveLength(3);
      expect(results.every(r => r === 'test response')).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('healthCheck', () => {
    it('returns true on successful health check', async () => {
      const client = new ZhipuAIClient({ apiKey: 'test', model: 'glm-4' });
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true
        } as Response)
      ) as any;

      const result = await client.healthCheck();
      expect(result).toBe(true);
    });

    it('returns false on failed health check', async () => {
      const client = new ZhipuAIClient({ apiKey: 'test', model: 'glm-4' });
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false
        } as Response)
      ) as any;

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });

    it('returns false on network error', async () => {
      const client = new ZhipuAIClient({ apiKey: 'test', model: 'glm-4' });
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as any;

      const result = await client.healthCheck();
      expect(result).toBe(false);
    });
  });
});
