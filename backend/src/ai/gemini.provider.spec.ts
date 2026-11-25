import {
  BadGatewayException,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './gemini.provider';

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  const createConfig = (overrides: Record<string, unknown> = {}) =>
    ({
      get: jest.fn((key: string) => {
        const defaults: Record<string, unknown> = {
          'gemini.apiKey': 'test-key-123',
          'gemini.model': 'gemini-3.8-flash',
          'gemini.fallbackModel': 'gemini-3.5-flash-lite',
          'gemini.timeoutMs': 200,
          'gemini.maxRetries': 1,
          'gemini.promptVersion': 'v1',
          ...overrides,
        };
        return defaults[key];
      }),
    }) as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new GeminiProvider(createConfig());
  });

  it('parses valid JSON and strips markdown fences', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '```json\n{"hello":"world"}\n```',
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
    });

    const result = await provider.complete<{ hello: string }>({
      system: 'sys',
      user: 'usr',
      schema: {},
      maxTokens: 100,
    });

    expect(result.data).toEqual({ hello: 'world' });
    expect(result.model).toBe('gemini-3.8-flash');
  });

  it('falls back immediately to gemini-3.5-flash-lite on 503/429 and remembers cooldown', async () => {
    const unavailableErr = Object.assign(new Error('503 high demand'), { status: 503 });
    mockGenerateContent
      .mockRejectedValueOnce(unavailableErr)
      .mockResolvedValueOnce({
        text: '{"ok":true}',
        usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 6 },
      })
      .mockResolvedValueOnce({
        text: '{"second":true}',
        usageMetadata: { promptTokenCount: 14, candidatesTokenCount: 7 },
      });

    const first = await provider.complete<{ ok: boolean }>({
      system: 'sys',
      user: 'usr',
      schema: {},
      maxTokens: 100,
    });

    expect(first.data).toEqual({ ok: true });
    expect(first.model).toBe('gemini-3.5-flash-lite');

    // Second call skips primary model immediately due to cooldown
    const second = await provider.complete<{ second: boolean }>({
      system: 'sys',
      user: 'usr2',
      schema: {},
      maxTokens: 100,
    });
    expect(second.data).toEqual({ second: true });
    expect(second.model).toBe('gemini-3.5-flash-lite');
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });

  it('throws BadGatewayException when API key is missing', async () => {
    const noKeyProvider = new GeminiProvider(createConfig({ 'gemini.apiKey': '' }));
    await expect(
      noKeyProvider.complete({ system: 's', user: 'u', schema: {}, maxTokens: 50 }),
    ).rejects.toThrow(BadGatewayException);
  });

  it('throws BadGatewayException on malformed JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: 'not json at all' });
    await expect(
      provider.complete({ system: 's', user: 'u', schema: {}, maxTokens: 50 }),
    ).rejects.toThrow(BadGatewayException);
  });

  it('sends a bounded thinking level so thinking tokens cannot exhaust the output budget', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: '{"a":1}' });
    await provider.complete({ system: 's', user: 'u', schema: {}, maxTokens: 50 });
    expect(mockGenerateContent.mock.calls[0][0].config.thinkingConfig).toEqual({
      thinkingLevel: 'MINIMAL',
    });
  });

  it('resends without thinkingConfig when a model rejects it with 400', async () => {
    const badArg = Object.assign(new Error('INVALID_ARGUMENT'), { status: 400 });
    mockGenerateContent
      .mockRejectedValueOnce(badArg)
      .mockResolvedValueOnce({ text: '{"ok":true}' });
    const result = await provider.complete({ system: 's', user: 'u', schema: {}, maxTokens: 50 });
    expect(result.data).toEqual({ ok: true });
    expect(mockGenerateContent.mock.calls[1][0].config.thinkingConfig).toBeUndefined();
  });

  it('falls back when the primary response is truncated (finishReason MAX_TOKENS)', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({
        text: '{"cut":',
        candidates: [{ finishReason: 'MAX_TOKENS' }],
      })
      .mockResolvedValueOnce({ text: '{"full":true}', candidates: [{ finishReason: 'STOP' }] });
    const result = await provider.complete({ system: 's', user: 'u', schema: {}, maxTokens: 50 });
    expect(result.data).toEqual({ full: true });
    expect(result.model).toBe('gemini-3.5-flash-lite');
  });

  it('maps an all-models-overloaded 503 to ServiceUnavailableException, not an API-key error', async () => {
    mockGenerateContent.mockRejectedValue(
      Object.assign(new Error('high demand'), { status: 503 }),
    );
    const promise = provider.complete({ system: 's', user: 'u', schema: {}, maxTokens: 50 });
    await expect(promise).rejects.toThrow(ServiceUnavailableException);
    await expect(promise).rejects.toThrow(/overloaded/);
  });

  it('throws GatewayTimeoutException when primary and fallback chain time out', async () => {
    mockGenerateContent.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ text: '{}' }), 1000)),
    );
    await expect(
      provider.complete({ system: 's', user: 'u', schema: {}, maxTokens: 50 }),
    ).rejects.toThrow(GatewayTimeoutException);
  });
});
