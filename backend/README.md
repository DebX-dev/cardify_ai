# Cardify AI — Backend (NestJS 11 + TypeScript + MongoDB + Gemini Free API)

## 1. Overview
The Cardify AI backend is a production-structured NestJS 11 REST API following strict MVC separation (**Controller → Service → Repository → Schema**). It accepts a product name, category, tone, and optional context, checks a fast in-memory TTL/LRU cache, calls Google Gemini via `@google/genai` to generate 3 distinct product card variants, runs an AI Interview Scorecard across 5 weighted criteria, persists every run to MongoDB 7, and exposes Swagger documentation at `/api-docs`.

## 2. Prerequisites
- **Node.js 24 LTS** (Krypton) & npm 11+
- **MongoDB 7** (via Docker Compose or local MongoDB service)
- **Free Google Gemini API key** (no credit card required)

## 3. Step-by-Step Setup
1. Copy the environment template:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Obtain a free Gemini API key:
   - Open **https://aistudio.google.com/apikey**
   - Sign in with a Google account and click **Create API key**
   - Paste the key into `backend/.env` as `GEMINI_API_KEY=...`
   - **Important:** Do **not** link a billing account; linking billing switches the project to paid tier.
3. From the repo root (`cardify-ai/`), start MongoDB 7:
   ```bash
   docker compose up -d
   ```
4. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
5. Start the development server:
   ```bash
   npm run start:dev
   ```
6. Open Swagger UI in your browser:
   - **http://localhost:3000/api-docs**

## 4. Step-by-Step API Usage (cURL)

1. **Generate 3 product card variants + AI Interview Scorecard (`POST /api/v1/runs`)**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/runs \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Wireless Mouse",
       "category": "Electronics",
       "tone": "Professional",
       "extraContext": "target: remote workers"
     }'
   ```
   Trimmed response (`201 Created`):
   ```json
   {
     "id": "673a9b5f12c34d567890abcd",
     "input": { "name": "Wireless Mouse", "category": "Electronics", "tone": "Professional" },
     "variants": [
       { "id": "v1", "tone": "Professional", "title": "Ergonomic Wireless Mouse for Remote Work", "description": "...", "tags": ["ergonomic", "wireless", "silent-click"] }
     ],
     "scorecard": [
       { "variantId": "v1", "scores": { "clarity": 92, "persuasion": 88, "seo": 85, "uniqueness": 78, "brandFit": 90 }, "total": 87.2, "verdict": "Strong hire" }
     ],
     "winnerId": "v1",
     "whyThisWon": "Strongest clarity + persuasion while staying on-tone.",
     "aiModel": "gemini-3.8-flash",
     "promptVersion": "v1",
     "latencyMs": 3421,
     "cached": false
   }
   ```

2. **List paginated history (`GET /api/v1/runs`)**:
   ```bash
   curl "http://localhost:3000/api/v1/runs?page=1&limit=20&q=Mouse&tone=Professional"
   ```

3. **Human winner override (`PATCH /api/v1/runs/:id/pick`)**:
   ```bash
   curl -X PATCH http://localhost:3000/api/v1/runs/<RUN_ID>/pick \
     -H "Content-Type: application/json" \
     -d '{ "variantId": "v2" }'
   ```

4. **Regenerate a single variant with feedback (`POST /api/v1/runs/:id/regenerate/:variantId`)**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/runs/<RUN_ID>/regenerate/v2 \
     -H "Content-Type: application/json" \
     -d '{ "feedback": "shorter, warmer, highlight battery life" }'
   ```

5. **Analyze SEO keywords for a variant (`POST /api/v1/runs/:id/seo`)**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/runs/<RUN_ID>/seo \
     -H "Content-Type: application/json" \
     -d '{ "variantId": "v1" }'
   ```

6. **Fetch analytics summary (`GET /api/v1/analytics/summary`)**:
   ```bash
   curl http://localhost:3000/api/v1/analytics/summary
   ```

7. **Check service + MongoDB health (`GET /api/v1/health`)**:
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

## 5. Folder Structure
```
backend/src/
├── main.ts                 # Bootstrap, global pipes/filters/interceptors, CORS, Swagger
├── app.module.ts           # Root NestJS wiring (Config, Pino, Mongoose, Throttler)
├── common/                 # Cross-cutting exception filter, request-id/logging, DTOs, TTL cache
├── config/                 # Typed configuration loader & Joi env validation schema
├── health/                 # Terminus health probe endpoint (/api/v1/health)
├── ai/                     # Swappable AiProvider, GeminiProvider (@google/genai), versioned prompts
└── modules/
    ├── product/            # MVC module: Controller, Service, Repository, Schema, DTOs, tests
    └── analytics/          # MongoDB aggregation pipeline for run metrics & winning tones
```

## 6. Design Choices
- **Strict NestJS MVC Separation**: `ProductController` handles only HTTP/Swagger concerns, `ProductService` orchestrates business rules and weighted scoring, `ProductRepository` encapsulates all Mongoose access and maps to clean domain DTOs, and `RunSchema` isolates persistence definitions and indexes.
- **Swappable `AiProvider` Token**: Business logic injects `AI_PROVIDER` rather than `@google/genai` directly, allowing future providers or test mocks with zero service rewrites.
- **Versioned Prompts (`VERSION = 'v1'`)**: All prompts and JSON response schemas live in `src/ai/prompts/` so prompt changes are auditable and stored alongside each run (`promptVersion`).
- **In-Memory LRU/TTL Cache (`MemoryCacheService`)**: Normalized `{ name, category, tone, extraContext }` keys return instant repeat responses (`cached: true`) without consuming Gemini free-tier quota; `bypassCache: true` forces a fresh AI call.
- **Protective Rate Limiting (`@nestjs/throttler`)**: Configured below Gemini's free-tier ceiling (`RATE_LIMIT_MAX=20` per `60s`) to protect project-wide quota.
- **Consistent Error Envelope & Traceability**: `RequestIdInterceptor` tags every request with `x-request-id` and `HttpExceptionFilter` normalizes all 4xx/5xx responses.
- **Terminus Health Probes**: `/api/v1/health` verifies live MongoDB connectivity via `MongooseHealthIndicator`.

## 7. AI Usage
### Runtime AI
- **Primary Model**: `gemini-3.8-flash` (free tier) via `@google/genai` with `responseMimeType: 'application/json'` and strict `responseSchema`.
- **Fallback Chain**: On primary `503`/`429`/timeout/`MAX_TOKENS` truncation, falls over immediately to `gemini-3.5-flash` → `gemini-3.5-flash-lite` → `gemini-3.7-flash` (max 1 retry each) and skips the primary for a 10-minute cooldown.
- **Thinking Cap**: `thinkingLevel: MINIMAL` keeps thinking tokens from consuming the output budget and truncating JSON.
- **Determinism & Token Guardrails**: `GEMINI_TEMPERATURE=0.7` for creative variants, `GEMINI_TEMPERATURE_SCORECARD=0.3` for deterministic scoring, `GEMINI_TIMEOUT_MS=30000`.
- **Privacy & Logging Policy**: Prompts, raw copy, and API keys are **never** logged. Structured Pino logs emit only `{ requestId, model, latencyMs, inputTokens, outputTokens, promptVersion }`.
- **Free-Tier Data-Use Caveat**: On the Google Gemini free tier (outside the EU), prompts and responses may be used by Google to improve products. Do not submit confidential or PII data.

### Development AI
- Codebase scaffolded following `PROMPT.md` specifications.
- Human-reviewed areas: weighted scorecard arithmetic (`0.25*clarity + 0.25*persuasion + 0.20*seo + 0.15*uniqueness + 0.15*brandFit`), Joi env validation bounds, cache invalidation on regenerate/pick, and error/timeout mapping.

## 8. Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment (`development` \| `production` \| `test`) |
| `PORT` | `3000` | HTTP listen port |
| `API_PREFIX` | `api/v1` | Global route prefix |
| `CORS_ORIGINS` | `http://localhost:4200` | Comma-separated allowed origins |
| `APP_NAME` | `Cardify AI` | Application & Swagger title |
| `MONGODB_URI` | `mongodb://localhost:27017/cardify_ai` | MongoDB connection URI |
| `MONGODB_DB_NAME` | `cardify_ai` | MongoDB database name |
| `GEMINI_API_KEY` | `""` | Free API key from Google AI Studio |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Primary Gemini model |
| `GEMINI_FALLBACK_MODEL` | `gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.7-flash` | Comma-separated fallback chain on 503/429/timeout/truncation |
| `GEMINI_THINKING_LEVEL` | `MINIMAL` | Caps Gemini thinking tokens so JSON output is not truncated (`MINIMAL`/`LOW`/`MEDIUM`/`HIGH`/`OFF`) |
| `GEMINI_MAX_TOKENS_VARIANTS` | `900` | Max output tokens for variant generation |
| `GEMINI_MAX_TOKENS_SCORECARD` | `1200` | Max output tokens for scorecard evaluation |
| `GEMINI_TEMPERATURE` | `0.7` | Sampling temperature for copy generation |
| `GEMINI_TEMPERATURE_SCORECARD` | `0.3` | Sampling temperature for scorecard evaluation |
| `GEMINI_TIMEOUT_MS` | `30000` | Per-call timeout in milliseconds |
| `AI_MAX_RETRIES` | `2` | Retries per model before fallback |
| `AI_PROMPT_VERSION` | `v1` | Prompt version stamped on saved runs |
| `CACHE_TTL_SECONDS` | `300` | In-memory cache TTL in seconds (`0` disables) |
| `CACHE_MAX_ENTRIES` | `200` | Max LRU cache entries |
| `RATE_LIMIT_TTL_SECONDS` | `60` | Throttler window in seconds |
| `RATE_LIMIT_MAX` | `20` | Max requests per window |
| `SWAGGER_ENABLED` | `true` | Toggle Swagger UI |
| `SWAGGER_PATH` | `api-docs` | Swagger mount path |
| `LOG_LEVEL` | `info` | Pino log level |

## 9. Testing
```bash
# Unit tests (mocked Gemini SDK + Repository)
npm test

# End-to-end tests (uses mongodb-memory-server + mocked AI provider)
npm run test:e2e
```

## 10. Troubleshooting
- **429 Too Many Requests**: Either Cardify's local rate limiter (`RATE_LIMIT_MAX`) or Gemini's free-tier RPM was reached. Wait 60s; check logs for automatic fallback to `gemini-3.5-flash-lite`.
- **503 Service Unavailable**: Gemini models are overloaded (high demand) or free-tier quota is exhausted. Retry after a few seconds.
- **502 Bad Gateway**: The message says which cause applies: rejected API key, unavailable model ID, or truncated/malformed AI output. Search logs for the `requestId` to see the underlying Gemini error.
- **MongoDB connection failed**: Ensure Docker Desktop is running and `docker compose up -d` succeeded from the repo root.

## 11. Limitations & Next Steps
- In-memory cache is single-instance; swap `MemoryCacheService` for Redis in multi-replica deployments.
- Next steps: Server-Sent Events (SSE) token streaming, user auth/workspaces, and A/B click-through tracking.
