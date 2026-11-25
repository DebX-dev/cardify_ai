import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().default('http://localhost:4200'),
  APP_NAME: Joi.string().default('Cardify AI'),

  MONGODB_URI: Joi.string().required(),
  MONGODB_DB_NAME: Joi.string().default('cardify_ai'),

  GEMINI_API_KEY: Joi.string().allow('').default(''),
  GEMINI_MODEL: Joi.string().default('gemini-3.8-flash'),
  GEMINI_FALLBACK_MODEL: Joi.string().default('gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.7-flash'),
  GEMINI_THINKING_LEVEL: Joi.string()
    .valid('MINIMAL', 'LOW', 'MEDIUM', 'HIGH', 'OFF', 'minimal', 'low', 'medium', 'high', 'off')
    .default('MINIMAL'),
  GEMINI_MAX_TOKENS_VARIANTS: Joi.number().integer().min(100).max(8192).default(900),
  GEMINI_MAX_TOKENS_SCORECARD: Joi.number().integer().min(100).max(8192).default(1200),
  GEMINI_TEMPERATURE: Joi.number().min(0).max(2).default(0.7),
  GEMINI_TEMPERATURE_SCORECARD: Joi.number().min(0).max(2).default(0.3),

  GEMINI_TIMEOUT_MS: Joi.number().integer().min(1000).max(120000).default(30000),
  AI_MAX_RETRIES: Joi.number().integer().min(0).max(5).default(2),
  AI_PROMPT_VERSION: Joi.string().default('v1'),

  CACHE_TTL_SECONDS: Joi.number().integer().min(0).max(86400).default(300),
  CACHE_MAX_ENTRIES: Joi.number().integer().min(1).max(5000).default(200),

  RATE_LIMIT_TTL_SECONDS: Joi.number().integer().min(1).default(60),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(20),

  SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('true'),
  SWAGGER_PATH: Joi.string().default('api-docs'),

  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),
});
