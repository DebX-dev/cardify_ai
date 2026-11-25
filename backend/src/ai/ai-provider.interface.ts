export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AiCompletionRequest {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxTokens: number;
  temperature?: number;
  requestId?: string;
  promptVersion?: string;
}

export interface AiCompletionResult<T> {
  data: T;
  model: string;
}

export interface AiProvider {
  complete<T>(args: AiCompletionRequest): Promise<AiCompletionResult<T>>;
  readonly model: string;
}
