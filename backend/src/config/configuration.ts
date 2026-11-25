export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:4200')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    name: process.env.APP_NAME ?? 'Cardify AI',
  },
  mongo: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/cardify_ai',
    dbName: process.env.MONGODB_DB_NAME ?? 'cardify_ai',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-3.8-flash',
    fallbackModel:
      process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.7-flash',
    thinkingLevel: process.env.GEMINI_THINKING_LEVEL ?? 'MINIMAL',
    maxTokensVariants: parseInt(process.env.GEMINI_MAX_TOKENS_VARIANTS ?? '900', 10),
    maxTokensScorecard: parseInt(process.env.GEMINI_MAX_TOKENS_SCORECARD ?? '1200', 10),
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE ?? '0.7'),
    temperatureScorecard: parseFloat(process.env.GEMINI_TEMPERATURE_SCORECARD ?? '0.3'),
    timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS ?? '30000', 10),
    maxRetries: parseInt(process.env.AI_MAX_RETRIES ?? '2', 10),
    promptVersion: process.env.AI_PROMPT_VERSION ?? 'v1',
  },
  cache: {
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS ?? '300', 10),
    maxEntries: parseInt(process.env.CACHE_MAX_ENTRIES ?? '200', 10),
  },
  rateLimit: {
    ttlSeconds: parseInt(process.env.RATE_LIMIT_TTL_SECONDS ?? '60', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '20', 10),
  },
  swagger: {
    enabled: (process.env.SWAGGER_ENABLED ?? 'true') === 'true',
    path: process.env.SWAGGER_PATH ?? 'api-docs',
  },
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
});
