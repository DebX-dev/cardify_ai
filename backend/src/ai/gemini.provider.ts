import { GoogleGenAI } from '@google/genai';
import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiCompletionRequest,
  AiCompletionResult,
  AiProvider,
} from './ai-provider.interface';

export class AiTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiTimeoutError';
  }
}

/** Raised when Gemini stops generating because the output token budget ran out. */
export class AiTruncatedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiTruncatedError';
  }
}

const PRIMARY_COOLDOWN_MS = 600_000; // 10 minutes cooldown when primary model is 503/429/unavailable

/**
 * Default fallback chain, tried in order after the primary model.
 * Only models that are served for generateContent on the free tier.
 */
const DEFAULT_FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.7-flash'];

type ThinkingLevel = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
const THINKING_LEVELS: readonly ThinkingLevel[] = ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'];

/**
 * Gemini AI provider backed by the official `@google/genai` SDK.
 * Fails over immediately on primary 503/429/timeout into a fallback model chain
 * with cooldown memory so subsequent calls skip the overloaded primary.
 */
@Injectable()
export class GeminiProvider implements AiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly client: GoogleGenAI | null;
  private readonly primaryModel: string;
  private readonly fallbackChain: string[];
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly defaultPromptVersion: string;
  private readonly thinkingLevel: ThinkingLevel | null;
  /** Models that rejected `thinkingConfig` with 400; later calls omit it. */
  private readonly noThinkingConfigModels = new Set<string>();
  private primaryCooldownUntil = 0;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('gemini.apiKey')?.trim() ?? '';
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
    this.primaryModel = this.configService.get<string>('gemini.model') ?? 'gemini-3.8-flash';

    // GEMINI_FALLBACK_MODEL accepts a single model or a comma-separated list.
    const configuredFallback = (this.configService.get<string>('gemini.fallbackModel') ?? '')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    this.fallbackChain = Array.from(
      new Set([...configuredFallback, ...DEFAULT_FALLBACK_MODELS]),
    ).filter((m) => Boolean(m) && m !== this.primaryModel);

    // Gemini 3.x "thinking" tokens count against maxOutputTokens. Left unbounded they
    // eat most of the budget and truncate the JSON mid-string (finishReason MAX_TOKENS).
    const rawThinking = (this.configService.get<string>('gemini.thinkingLevel') ?? 'MINIMAL')
      .trim()
      .toUpperCase();
    this.thinkingLevel = THINKING_LEVELS.includes(rawThinking as ThinkingLevel)
      ? (rawThinking as ThinkingLevel)
      : null; // 'OFF' or empty => model default

    this.timeoutMs = this.configService.get<number>('gemini.timeoutMs') ?? 30_000;
    this.maxRetries = this.configService.get<number>('gemini.maxRetries') ?? 2;
    this.defaultPromptVersion =
      this.configService.get<string>('gemini.promptVersion') ?? 'v1';
  }

  get model(): string {
    return this.primaryModel;
  }

  async complete<T>(args: AiCompletionRequest): Promise<AiCompletionResult<T>> {
    if (!this.client) {
      throw new BadGatewayException(
        'GEMINI_API_KEY is not configured. Add a free key from https://aistudio.google.com/apikey to backend/.env.',
      );
    }

    const hasFallback = this.fallbackChain.length > 0;
    const primaryInCooldown = hasFallback && Date.now() < this.primaryCooldownUntil;

    if (!primaryInCooldown) {
      // Fail over fast on primary when fallback exists so an overloaded 503 doesn't stall UX
      const primaryRetries = hasFallback ? 0 : this.maxRetries;
      const primaryTimeout = hasFallback ? Math.min(this.timeoutMs, 8_000) : this.timeoutMs;

      try {
        return await this.executeWithRetries<T>(
          this.primaryModel,
          args,
          primaryRetries,
          primaryTimeout,
        );
      } catch (primaryErr) {
        if (!hasFallback || !this.shouldFallback(primaryErr)) {
          throw this.mapProviderError(primaryErr, args.requestId, this.primaryModel);
        }

        this.primaryCooldownUntil = Date.now() + PRIMARY_COOLDOWN_MS;
        this.logger.warn({
          event: 'gemini_model_fallback',
          requestId: args.requestId ?? null,
          fromModel: this.primaryModel,
          toModel: this.fallbackChain[0],
          reason:
            this.extractStatusCode(primaryErr) ??
            (primaryErr instanceof Error ? primaryErr.name : 'rate_limit_or_unavailable'),
        });
      }
    }

    let lastFallbackErr: unknown;
    let lastFallbackModel = this.fallbackChain[0];
    // Full JSON generation takes ~5-7s on flash models, so give fallbacks enough headroom.
    const perFallbackTimeout = Math.min(this.timeoutMs, 15_000);
    for (const candidateModel of this.fallbackChain) {
      try {
        // At most one retry per fallback: when a model is overloaded, moving on to the
        // next model in the chain is faster than hammering the same one.
        return await this.executeWithRetries<T>(
          candidateModel,
          args,
          Math.min(1, this.maxRetries),
          perFallbackTimeout,
        );
      } catch (err) {
        lastFallbackErr = err;
        lastFallbackModel = candidateModel;
        this.logger.warn({
          event: 'gemini_fallback_model_failed',
          requestId: args.requestId ?? null,
          model: candidateModel,
          status: this.extractStatusCode(err),
          errorName: err instanceof Error ? err.name : 'UnknownError',
        });
        if (!this.shouldFallback(err)) {
          throw this.mapProviderError(err, args.requestId, candidateModel);
        }
      }
    }

    throw this.mapProviderError(lastFallbackErr, args.requestId, lastFallbackModel);
  }

  private async executeWithRetries<T>(
    modelName: string,
    args: AiCompletionRequest,
    maxRetries: number,
    timeoutMs: number,
  ): Promise<AiCompletionResult<T>> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (attempt > 0) {
        const backoffMs = Math.min(250 * 2 ** (attempt - 1), 1500);
        await this.sleep(backoffMs);
      }

      const startedAt = Date.now();
      try {
        const response = await this.withTimeout(
          this.generate(modelName, args),
          timeoutMs,
        );

        const latencyMs = Date.now() - startedAt;
        const usage = response.usageMetadata;

        this.logger.log({
          requestId: args.requestId ?? null,
          model: modelName,
          latencyMs,
          inputTokens: usage?.promptTokenCount ?? null,
          outputTokens: usage?.candidatesTokenCount ?? null,
          thinkingTokens: usage?.thoughtsTokenCount ?? null,
          promptVersion: args.promptVersion ?? this.defaultPromptVersion,
        });

        const finishReason = response.candidates?.[0]?.finishReason as string | undefined;
        if (finishReason === 'MAX_TOKENS') {
          throw new AiTruncatedError(
            `Gemini output truncated at ${args.maxTokens} tokens (thinking=${usage?.thoughtsTokenCount ?? 0}).`,
          );
        }

        const rawText = response.text ?? '';
        const parsed = this.parseJsonPayload<T>(rawText);
        return { data: parsed, model: modelName };
      } catch (err) {
        lastError = err;
        if (!this.isRetryableError(err) || attempt === maxRetries) {
          throw err;
        }
      }
    }

    throw lastError;
  }

  /**
   * Calls generateContent with a bounded thinking level. If a model rejects
   * `thinkingConfig` (400 INVALID_ARGUMENT) it is remembered and the call is resent without it.
   */
  private async generate(modelName: string, args: AiCompletionRequest) {
    const baseConfig = {
      systemInstruction: args.system,
      responseMimeType: 'application/json',
      responseSchema: args.schema,
      maxOutputTokens: args.maxTokens,
      temperature: args.temperature,
    };
    const useThinking =
      this.thinkingLevel !== null && !this.noThinkingConfigModels.has(modelName);

    if (!useThinking) {
      return this.client!.models.generateContent({
        model: modelName,
        contents: args.user,
        config: baseConfig,
      });
    }

    try {
      return await this.client!.models.generateContent({
        model: modelName,
        contents: args.user,
        config: {
          ...baseConfig,
          // Cast: SDK enum values are the same upper-case strings.
          thinkingConfig: { thinkingLevel: this.thinkingLevel as never },
        },
      });
    } catch (err) {
      if (this.extractStatusCode(err) !== 400) throw err;
      this.noThinkingConfigModels.add(modelName);
      this.logger.warn({
        event: 'gemini_thinking_config_rejected',
        requestId: args.requestId ?? null,
        model: modelName,
      });
      return this.client!.models.generateContent({
        model: modelName,
        contents: args.user,
        config: baseConfig,
      });
    }
  }

  /** Strips optional ```json ... ``` markdown fences before JSON.parse. */
  parseJsonPayload<T>(raw: string): T {
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new BadGatewayException('AI provider returned an empty response.');
    }

    const stripped = trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      return JSON.parse(stripped) as T;
    } catch {
      throw new BadGatewayException('AI provider returned malformed JSON.');
    }
  }

  private async withTimeout<R>(promise: Promise<R>, timeoutMs: number): Promise<R> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new AiTimeoutError(`Gemini request timed out after ${timeoutMs}ms`)),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private isRetryableError(err: unknown): boolean {
    if (err instanceof AiTimeoutError) return true;
    const status = this.extractStatusCode(err);
    return status === 429 || (status !== null && status >= 500 && status < 600);
  }

  private shouldFallback(err: unknown): boolean {
    if (err instanceof AiTimeoutError || err instanceof AiTruncatedError) return true;
    const status = this.extractStatusCode(err);
    if (
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      status === 404
    ) {
      return true;
    }
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    return (
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      msg.includes('unavailable') ||
      msg.includes('overloaded') ||
      msg.includes('high demand')
    );
  }

  private extractStatusCode(err: unknown): number | null {
    if (typeof err !== 'object' || err === null) return null;
    const record = err as Record<string, unknown>;
    if (typeof record.status === 'number') return record.status;
    if (typeof record.statusCode === 'number') return record.statusCode;
    if (typeof record.code === 'number') return record.code;
    return null;
  }

  private mapProviderError(err: unknown, requestId?: string, model?: string): Error {
    const status = this.extractStatusCode(err);
    this.logger.error({
      event: 'gemini_call_failed',
      requestId: requestId ?? null,
      model: model ?? this.primaryModel,
      status,
      errorName: err instanceof Error ? err.name : 'UnknownError',
      errorMessage: err instanceof Error ? err.message.slice(0, 300) : String(err),
    });

    if (
      err instanceof BadGatewayException ||
      err instanceof GatewayTimeoutException ||
      err instanceof ServiceUnavailableException
    ) {
      return err;
    }
    if (err instanceof AiTimeoutError) {
      return new GatewayTimeoutException('AI provider timed out. Please retry.');
    }
    if (err instanceof AiTruncatedError) {
      return new BadGatewayException('AI response was cut off before completion. Please retry.');
    }
    if (status === 429) {
      return new ServiceUnavailableException(
        'Gemini free-tier quota temporarily exhausted. Please wait a moment and retry.',
      );
    }
    if (status !== null && status >= 500 && status < 600) {
      return new ServiceUnavailableException(
        'Gemini models are temporarily overloaded (high demand). Please retry in a few seconds.',
      );
    }
    if (status === 401 || status === 403) {
      return new BadGatewayException(
        'Gemini rejected the API key. Verify GEMINI_API_KEY in backend/.env.',
      );
    }
    if (status === 404) {
      return new BadGatewayException(
        `Gemini model "${model ?? this.primaryModel}" is not available. Check GEMINI_MODEL / GEMINI_FALLBACK_MODEL.`,
      );
    }
    return new BadGatewayException(
      'AI provider request failed. Check backend logs for the Gemini error details.',
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
