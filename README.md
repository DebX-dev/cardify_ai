# Cardify AI — Card + Simplify

> Turn a product name into **3 ready-to-publish product cards**, each scored by AI on a 5-point scorecard, in a few seconds.
> Built with **Angular 21**, **NestJS 11**, **MongoDB 7** and **Google Gemini (free tier)**.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Features](#2-features)
3. [Tech Stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [How It Works (Request Flow)](#5-how-it-works-request-flow)
6. [Prerequisites](#6-prerequisites)
7. [Setup — Database](#7-setup--database-mongodb-7)
8. [Setup — Backend](#8-setup--backend-nestjs-11)
9. [Setup — Frontend](#9-setup--frontend-angular-21)
10. [API Reference](#10-api-reference)
11. [Design Choices](#11-design-choices)
12. [Where AI Is Used](#12-where-ai-is-used)
13. [Project Structure](#13-project-structure)
14. [Testing](#14-testing)
15. [Troubleshooting](#15-troubleshooting)
16. [Limitations & Next Steps](#16-limitations--next-steps)

---

## 1. Project Overview

- **Problem:** Writing product titles, descriptions and tags for an online store is slow, and it is hard to tell which version will convert best.
- **Solution:** Cardify AI takes four inputs and returns three different product-card variants, then scores each one like a hiring interview:
  - **Name**: for example, `Matcha Ceremonial Tin`
  - **Category**: for example, `Food & Beverage`
  - **Tone**: `Auto`, `Professional`, `Playful`, `Luxury`, `Minimal` or `Technical`
  - **Extra context** (optional, up to 200 characters): for example, `target: remote workers`
- **Output per run:**
  - 3 variants, each with a **title**, **description** and **3–6 SEO tags**, written in a different tone.
  - A **scorecard** for each variant on 5 criteria: Clarity, Persuasion, SEO, Uniqueness and Brand Fit.
  - A **weighted total**, a **verdict** (Strong hire / Hire / Borderline / No hire) and a **winner**, with a "why this won" explanation.
- **After a run you can:**
  - pick your own winner
  - regenerate one variant with feedback
  - rewrite a variant in another tone
  - run an SEO keyword analysis
  - export the cards
  - reopen any past run from History
- **Persistence:** Every run is saved to MongoDB, so history and analytics survive restarts.

---

## 2. Features

### Generation & Scoring
- **3 variants in one AI call.** Variants and scorecard are produced together in a single structured JSON response.
- **Weighted scorecard:** `total = 0.25·Clarity + 0.25·Persuasion + 0.20·SEO + 0.15·Uniqueness + 0.15·BrandFit`.
- **Verdict thresholds:** ≥ 85 → *Strong hire*, ≥ 70 → *Hire*, ≥ 55 → *Borderline*, otherwise *No hire*.
- **Winner banner:** announces the top card with a one-time confetti burst and the `whyThisWon` explanation.
- **Ranked leaderboard:** cards are ordered by score, with animated score rings and a 5-axis SVG radar chart.

### Post-Generation Actions
- **Human pick:** override the AI winner (`PATCH /runs/:id/pick`).
- **Regenerate with feedback:** rewrite and re-score a single variant, e.g. *"shorter, warmer, mention battery life"*.
- **Tone transform:** rewrite one variant in a different brand voice and re-score it.
- **SEO analysis:** shows keyword density and suggests 3 missing high-intent keywords.

### Export
- One-click copy as **JSON**, **Shopify JSON**, **Amazon bullet points** or **Markdown**.
- **Export PDF** through the browser's print dialog, using a dedicated print stylesheet.

### History & Analytics
- **History drawer:** search past runs, filter by tone and reopen any run instantly.
- **Analytics summary:** total runs, average scores and the most frequently winning tones, computed with a MongoDB aggregation pipeline.

### Speed & Reliability
- **3-layer cache:**
  - browser `localStorage` (30 min)
  - backend in-memory LRU/TTL cache (5 min)
  - latest matching run in MongoDB
- **Bypass the cache:** the **Refresh from AI** button forces a fresh AI call.
- **Automatic model fallback:** if the primary Gemini model is overloaded (503), rate-limited (429), slow or cut off, the backend moves on to the next model in a fallback chain.
- **Rate limiting:** 20 requests per minute, kept below Gemini's free-tier limit.
- **Request tracing:** every request gets an `x-request-id`, and errors come back in a consistent JSON format.

### UX & Accessibility
- **Light / dark / system theme**, saved between visits.
- **Keyboard shortcuts:** `/` focuses the product name; `Esc` closes drawers.
- **Screen-reader support:** `aria-live` winner announcements, labelled form fields and visible focus rings.
- **Reduced motion:** `prefers-reduced-motion` disables the animations.
- **Toasts with a Retry button** when generation fails.

---

## 3. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Angular 21 (standalone, **zoneless**, Signals) | Fine-grained reactivity without `zone.js`; fast change detection |
| Styling | Tailwind CSS v4 + per-component CSS | Utility-first layout; component-only styles stay in the component |
| Fonts | `@fontsource` Inter + Fraunces | Self-hosted fonts, no external CDN |
| Backend | NestJS 11 (TypeScript) | Modular MVC, dependency injection, built-in validation and Swagger |
| AI SDK | `@google/genai` (official Google SDK) | Structured JSON output via `responseSchema` |
| AI Models | `gemini-3.8-flash` (primary) + fallback chain | Free tier, fast, supports JSON schemas |
| Database | MongoDB 7 + Mongoose 8 | Run documents are naturally nested JSON |
| Logging | Pino (structured JSON logs) | Low overhead, machine-readable |
| API Docs | Swagger / OpenAPI at `/api-docs` | Live, testable documentation |
| Testing | Jest (backend), Vitest (frontend), `mongodb-memory-server` (e2e) | Fast and isolated; no real AI calls in tests |
| Infra | Docker Compose (MongoDB) | One-command database setup |

---

## 4. Architecture

```
┌──────────────────────────────────┐       REST (/api/v1)        ┌──────────────────────────────────────┐
│       Frontend (Angular 21)      │ ──────────────────────────► │          Backend (NestJS 11)         │
│  • Zoneless + Signals store      │                             │  • MVC: Controller → Service → Repo  │
│  • Tailwind v4 glass UI          │ ◄────────────────────────── │  • In-memory LRU/TTL cache           │
│  • localStorage instant cache    │       JSON + Swagger        │  • GeminiProvider (@google/genai)    │
│  • SVG score rings & radar chart │                             │  • Fallback chain + thinking cap     │
└──────────────────────────────────┘                             └───────────┬──────────────┬───────────┘
                                                                             │ Mongoose 8   │ HTTPS
                                                                             ▼              ▼
                                                          ┌─────────────────────────┐  ┌─────────────────────────┐
                                                          │        MongoDB 7        │  │   Google Gemini API     │
                                                          │   Database: cardify_ai  │  │  (free tier, JSON mode) │
                                                          └─────────────────────────┘  └─────────────────────────┘
```

- **The frontend never talks to Gemini.** The API key exists only in `backend/.env`.
- **The backend is the only AI client.** It owns prompts, schemas, retries, fallback and error mapping.

---

## 5. How It Works (Request Flow)

What happens when you click **Generate Details (3 Variants)**:

1. **Form validation (frontend).** Name and category are required; extra context is limited to 200 characters.
2. **Browser cache check.** `CacheService` looks for the same normalized input in `localStorage`. On a hit, the cards render instantly and are labelled "⚡ Instant Browser Cache".
3. **API call.** `ProductService` sends `POST /api/v1/runs`. HTTP interceptors handle the loading state and error toasts.
4. **Validation (backend).** `ValidationPipe` checks the request against `GenerateRunDto` using class-validator.
5. **Backend cache check:**
   - **L1:** in-memory LRU/TTL cache keyed by `{name, category, tone, extraContext}`.
   - **L2:** the latest matching run already stored in MongoDB.
   - On a hit, the stored run is returned with `cached: true` and **no Gemini call**.
6. **Prompt build.** A versioned prompt from `src/ai/prompts/` plus a strict JSON `responseSchema`.
7. **Gemini call (`GeminiProvider`):**
   - Tries the primary model `gemini-3.8-flash` with an 8-second timeout.
   - If the model is overloaded (503), rate-limited (429), times out, or its output is cut off (`MAX_TOKENS`), the backend falls back in order to `gemini-3.5-flash` → `gemini-3.5-flash-lite` → `gemini-3.7-flash`.
   - After a failure, the primary model is skipped for 10 minutes so later requests stay fast.
   - Thinking is capped at `MINIMAL` so the model's internal reasoning cannot use up the output-token budget and cut the JSON short.
8. **Normalize and score.** The service trims to 3 variants, cleans tags, recomputes the weighted totals and verdicts **in code** (the AI's arithmetic is not trusted) and chooses the winner.
9. **Persist.** The run is saved to MongoDB together with `aiModel`, `promptVersion` and `latencyMs`, then cached in L1.
10. **Render.** The signal store updates; the winner banner, confetti, ranked cards, score rings and radar chart appear, and the history drawer refreshes.

---

## 6. Prerequisites

- **Node.js 24 LTS** and **npm 11+**
- **Docker Desktop**, for MongoDB. A locally installed MongoDB 7 also works.
- **A free Google Gemini API key** from https://aistudio.google.com/apikey. No credit card is needed.
  > ⚠️ Do **not** link a billing account to the key's Google Cloud project. Doing so moves it to the paid tier.

---

## 7. Setup — Database (MongoDB 7)

1. From the repo root, start MongoDB:
   ```bash
   docker compose up -d
   ```
2. Check that the container is healthy:
   ```bash
   docker ps --filter name=cardify-mongodb
   ```
   - MongoDB is available at `mongodb://localhost:27017/cardify_ai`.
   - Data is kept in the `cardify_mongo_data` Docker volume.

---

## 8. Setup — Backend (NestJS 11)

1. Create the env file:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Open `backend/.env` and set your key:
   ```env
   GEMINI_API_KEY=your-key-here
   ```
3. Install dependencies and start in watch mode:
   ```bash
   npm install
   npm run start:dev
   ```
4. Check that it is running:
   - API base: http://localhost:3000/api/v1
   - Swagger UI: http://localhost:3000/api-docs
   - Health check: http://localhost:3000/api/v1/health

### Key backend environment variables

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | — | Free API key from Google AI Studio (**required**) |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Primary model |
| `GEMINI_FALLBACK_MODEL` | `gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.7-flash` | Comma-separated fallback chain, tried in order |
| `GEMINI_THINKING_LEVEL` | `MINIMAL` | `MINIMAL` / `LOW` / `MEDIUM` / `HIGH` / `OFF`. Caps thinking tokens so the JSON is not truncated |
| `GEMINI_TEMPERATURE` | `0.7` | Creativity for copy generation |
| `GEMINI_TEMPERATURE_SCORECARD` | `0.3` | Lower temperature for more consistent scoring |
| `GEMINI_TIMEOUT_MS` | `30000` | Upper bound for each AI call |
| `AI_MAX_RETRIES` | `2` | Retry budget |
| `AI_PROMPT_VERSION` | `v1` | Prompt version stamped on each saved run |
| `MONGODB_URI` | `mongodb://localhost:27017/cardify_ai` | Database connection |
| `CACHE_TTL_SECONDS` / `CACHE_MAX_ENTRIES` | `300` / `200` | In-memory cache settings |
| `RATE_LIMIT_TTL_SECONDS` / `RATE_LIMIT_MAX` | `60` / `20` | Request throttling |
| `CORS_ORIGINS` | `http://localhost:4200` | Allowed frontend origins |
| `SWAGGER_ENABLED` / `SWAGGER_PATH` | `true` / `api-docs` | API docs |

The full list is in [backend/README.md](./backend/README.md#8-environment-variables). All variables are validated at startup with Joi, so a bad value fails fast with a clear error.

---

## 9. Setup — Frontend (Angular 21)

1. Create the env file:
   ```bash
   cd frontend
   cp .env.example .env
   ```
2. Install dependencies and start the dev server:
   ```bash
   npm install
   npx ng serve
   ```
3. Open **http://localhost:4200**. The backend must be running on port 3000.

### Frontend environment variables

| Variable | Default | Purpose |
|---|---|---|
| `NG_APP_API_BASE_URL` | `http://localhost:3000/api/v1` | Backend API URL |
| `NG_APP_APP_NAME` | `Cardify AI` | Display name |
| `NG_APP_REQUEST_TIMEOUT_MS` | `90000` | HTTP timeout |
| `NG_APP_ENABLE_DEBUG` | `true` | Development diagnostics |

### Quick UI walkthrough
1. Enter a product name (press `/` to focus it), a category and a tone, or click a preset such as *Wireless Mouse*, *Matcha Tin* or *Desk Organizer*.
2. Click **Generate Details (3 Variants) →**.
3. Read the winner banner and the ranked cards, then open the scorecard or radar chart.
4. Optionally:
   - **SEO:** analyse keywords
   - **↻ Regenerate:** rewrite one card with feedback
   - **Tone →:** rewrite a card in another tone
   - **Pick:** choose your own winner
5. Copy the cards as JSON, Shopify, Amazon bullets or Markdown, or export a PDF.
6. Open **History** to search past runs and see analytics.

---

## 10. API Reference

Base URL: `http://localhost:3000/api/v1`. Interactive docs are at `/api-docs`.

| Method | Endpoint | Description | AI call? |
|---|---|---|---|
| `POST` | `/runs` | Generate 3 variants + scorecard + winner | ✅ (unless cached) |
| `GET` | `/runs?page=&limit=&q=&tone=` | Paginated, searchable history | ❌ |
| `GET` | `/runs/:id` | Fetch one run | ❌ |
| `PATCH` | `/runs/:id/pick` | Human override of the winner | ❌ |
| `POST` | `/runs/:id/regenerate/:variantId` | Rewrite and re-score one variant using feedback | ✅ |
| `POST` | `/runs/:id/transform` | Rewrite one variant in a new tone | ✅ |
| `POST` | `/runs/:id/seo` | Keyword density + missing keywords | ✅ |
| `GET` | `/analytics/summary` | Aggregated run metrics and winning tones | ❌ |
| `GET` | `/health` | Service + MongoDB health | ❌ |

Example:
```bash
curl -X POST http://localhost:3000/api/v1/runs \
  -H "Content-Type: application/json" \
  -d '{ "name": "Matcha Ceremonial Tin", "category": "Food & Beverage", "tone": "Luxury" }'
```

Error responses always use the same format:
```json
{
  "statusCode": 503,
  "error": "Service Unavailable",
  "message": "Gemini models are temporarily overloaded (high demand). Please retry in a few seconds.",
  "requestId": "ff126860-…",
  "timestamp": "2026-11-25T15:33:15.830Z",
  "path": "/api/v1/runs"
}
```

---

## 11. Design Choices

### Backend
1. **Strict MVC layering (Controller → Service → Repository → Schema)**
   - Controllers handle only HTTP and Swagger concerns.
   - Services hold the business rules, such as scoring and winner selection.
   - Repositories are the only code that touches Mongoose.
   - *Why:* each layer can be tested and replaced on its own.
2. **A swappable `AI_PROVIDER` injection token.** Business code depends on an `AiProvider` interface, not on the Gemini SDK.
   - *Why:* another provider (or a mock in tests) can be dropped in without rewriting the services.
3. **One combined AI call for variants and scorecard.** Generation and scoring happen in a single structured request instead of two.
   - *Why:* about half the latency and half the free-tier quota.
4. **Structured JSON output (`responseMimeType: application/json` + `responseSchema`).** The model is constrained to a schema, and the backend still parses defensively (it strips markdown fences and rejects malformed JSON).
   - *Why:* no regex scraping of free text.
5. **Scores are recomputed in code, not trusted from the AI.** The AI gives the five sub-scores (0–100); the service calculates the weighted total, verdict and winner itself.
   - *Why:* LLMs are unreliable at arithmetic, and code is deterministic and auditable.
6. **Resilient model strategy:**
   - **Fast failover.** The primary model is never retried; on 503/429/timeout/truncation the backend moves straight to the next model.
   - **Cooldown memory.** After a failure, the primary model is skipped for 10 minutes, so later requests don't wait on it again.
   - **Thinking cap.** Gemini 3.x "thinking" tokens share the output budget; capping them at `MINIMAL` stops the JSON from being cut mid-string.
   - **Accurate error mapping:**

     | Cause | Response |
     |---|---|
     | Overload or quota | 503 |
     | Bad API key | 502 with a key-specific message |
     | Model not found | 502 naming the model |
     | Timeout | 504 |

7. **Versioned prompts (`src/ai/prompts/`, `VERSION = 'v1'`).** Every saved run records its `promptVersion`.
   - *Why:* prompt changes are auditable, and their quality can be compared over time.
8. **Multi-layer caching.** In-memory LRU/TTL first, then the latest matching run in MongoDB.
   - *Why:* repeat queries are instant and use no AI quota. `bypassCache: true` forces a fresh call.
9. **Rate limiting** (`@nestjs/throttler`, 20 requests per 60 s).
   - *Why:* protects the shared free-tier quota from bursts.
10. **Observability.**
    - Pino structured logs record `requestId`, `model`, `latencyMs` and token counts.
    - **Prompts, generated copy and API keys are never logged.**
11. **Fail-fast configuration.** All environment variables are validated with Joi when the app starts.

### Frontend
1. **Zoneless Angular 21 + Signals.**
   - Built on `provideZonelessChangeDetection()`, `OnPush` everywhere, `input()`/`output()`, `computed()` and `effect()`.
   - *Why:* smaller bundle, predictable rendering and no `zone.js` overhead.
2. **Signal store (`generator.store.ts`).** A single source of truth for the current run, loading state, errors and the active variant.
   - Components stay presentational.
3. **Separated component files.** Every component lives in its own folder with three files:
   ```
   variant-card/
     variant-card.component.ts    ← logic only (templateUrl / styleUrl)
     variant-card.component.html  ← template
     variant-card.component.css   ← component-only styles
   ```
   - Styles shared across components (`glass-panel`, `font-display`, theme tokens, print rules) stay in `src/styles.css`.
   - *Why:* clear separation of concerns, cleaner diffs and better editor support for HTML and CSS.
4. **Feature-based folders.**
   - `core/`: services, models, interceptors
   - `shared/ui/`: reusable UI pieces
   - `features/generator/`: the lazy-loaded feature
5. **Browser cache (`CacheService`).** `localStorage` plus memory, with a 30-minute TTL, for runs, history and SEO results.
   - *Why:* instant repeat renders and less load on the backend.
6. **Functional HTTP interceptors.** One handles loading state; the other turns backend errors into toasts that show the **backend's real message**.
7. **Zero-dependency visuals.** The radar chart is hand-written SVG and the confetti is a small canvas script.
   - *Why:* no heavy charting or animation libraries.
8. **Accessibility first.**
   - Semantic landmarks
   - Labelled inputs
   - `aria-live` announcements
   - Visible focus rings
   - Reduced-motion support
   - WCAG AA contrast
9. **Security.** The frontend never sees or sends the Gemini API key.

---

## 12. Where AI Is Used

### A. Runtime AI (inside the running product)

All AI calls happen **only in the backend**, through `GeminiProvider` (`backend/src/ai/gemini.provider.ts`) using the official `@google/genai` SDK.

| # | Feature | Endpoint | Prompt file | What the AI does | Temperature |
|---|---|---|---|---|---|
| 1 | **Card generation + scorecard** | `POST /runs` | `combined.prompt.ts` | Writes 3 variants (title, description, tags) in distinct tones; scores each on 5 criteria with a written reason per score; proposes a winner and `whyThisWon` | 0.7 |
| 2 | **Regenerate with feedback** | `POST /runs/:id/regenerate/:variantId` | `regenerate.prompt.ts` | Rewrites one variant based on the user's feedback and re-scores it | 0.7 |
| 3 | **Tone transform** | `POST /runs/:id/transform` | `regenerate.prompt.ts` | Rewrites one variant in a new brand voice and re-scores it | 0.7 |
| 4 | **SEO analysis** | `POST /runs/:id/seo` | `seo.prompt.ts` | Estimates keyword density and suggests 3 missing high-intent keywords | 0.3 |

**What the AI does not do:**
- It does **not** decide final totals, verdicts or the winner. Those are recomputed in `ProductService` with the fixed weighted formula.
- It does **not** run for history, analytics, picks or cache hits. Those are plain database or cache reads.

**Guardrails around the AI:**
- Strict JSON schema output, plus defensive parsing.
- Truncation detection (`finishReason: MAX_TOKENS`), which triggers a fallback to the next model.
- A thinking-token cap (`GEMINI_THINKING_LEVEL=MINIMAL`).
- Timeouts, at most one retry per fallback model, a fallback chain and a 10-minute cooldown on the primary model.
- Rate limiting and caching to protect free-tier quota.
- Output normalization: exactly 3 variants, 3–6 tags, trimmed text.

**Privacy:**
- Prompts and responses are never logged.
- ⚠️ On the Gemini free tier (outside the EU), Google may use prompts and responses to improve its products. Do not enter confidential data or personal information.

### B. Development AI (used while building the project)

- **Scaffolding:** the initial backend and frontend code was generated with an AI coding assistant from the specification in [`PROMPT.md`](./PROMPT.md).
- **Debugging:** an AI assistant helped diagnose the production `502 "Verify GEMINI_API_KEY"` error. The key was fine; the actual causes were:
  - Gemini returning 503 overload errors.
  - Thinking tokens using up the output budget, so the JSON was cut off.
  - A primary-model timeout that was too short.
  - Misleading error mapping.

  These are fixed by the fallback chain, the thinking cap, truncation detection and accurate error messages.
- **Refactoring:** an AI assistant split the inline Angular templates into separate `.ts` / `.html` / `.css` files per component.
- **Human-reviewed areas:**
  - Weighted scorecard maths and verdict thresholds
  - Joi environment-variable bounds
  - Cache invalidation after regenerate and pick
  - Error and timeout mapping
  - WCAG contrast and focus rings
  - Reduced-motion behaviour
  - Every AI-generated change was built and tested before merging

---

## 13. Project Structure

```
cardify-ai/
├── docker-compose.yml              # MongoDB 7 container + volume
├── PROMPT.md                       # Original product/engineering specification
├── README.md                       # ← you are here
├── backend/                        # NestJS 11 API
│   ├── .env.example
│   └── src/
│       ├── main.ts                 # Bootstrap: pipes, filters, interceptors, CORS, Swagger
│       ├── app.module.ts           # Config, Pino, Mongoose, Throttler wiring
│       ├── ai/
│       │   ├── ai-provider.interface.ts   # Swappable AI_PROVIDER contract
│       │   ├── gemini.provider.ts         # Gemini SDK, fallback chain, error mapping
│       │   └── prompts/                   # Versioned prompts + JSON response schemas
│       ├── common/                 # Exception filter, request-id/logging interceptors, cache, DTOs
│       ├── config/                 # Typed config loader + Joi env validation
│       ├── health/                 # /health (Terminus + MongoDB ping)
│       └── modules/
│           ├── product/            # Controller, Service, Repository, Schema, DTOs, tests
│           └── analytics/          # Aggregation pipeline for metrics
└── frontend/                       # Angular 21 SPA
    ├── .env.example
    └── src/
        ├── main.ts                 # Zoneless bootstrap
        ├── styles.css              # Tailwind v4 theme, shared classes, print & motion rules
        └── app/
            ├── app.component.{ts,html,css}
            ├── core/               # Models, ProductService, Cache/History/Theme/Toast/Clipboard, interceptors
            ├── shared/ui/          # button, card, tag, toast, skeleton, empty-state,
            │                       # score-ring, radar-chart, confetti  (each: .ts + .html + .css)
            └── features/generator/
                ├── generator.page.{ts,html,css}
                ├── state/generator.store.ts     # Signal store
                └── components/                  # product-form, variant-grid, variant-card,
                                                 # scorecard-panel, winner-banner, seo-panel,
                                                 # history-drawer (each: .ts + .html + .css)
```

---

## 14. Testing

```bash
# Backend — unit tests (Gemini SDK and repository are mocked)
cd backend && npm test

# Backend — end-to-end tests (mongodb-memory-server + mocked AI provider)
cd backend && npm run test:e2e

# Frontend — unit tests (Vitest)
cd frontend && npm test

# Frontend — production build
cd frontend && npm run build
```

- Tests **never call the real Gemini API**, so they are free, fast and deterministic.
- The `GeminiProvider` tests cover:
  - JSON fence stripping
  - Fallback with cooldown
  - Thinking-config retry
  - Truncation fallback
  - 503 → overloaded mapping
  - Timeouts

---

## 15. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `503 "Gemini models are temporarily overloaded"` | Google-side high demand on every model in the chain | Wait a few seconds and click **Retry**, or add more models to `GEMINI_FALLBACK_MODEL` |
| `503 "free-tier quota temporarily exhausted"` | Gemini free-tier per-minute limit reached | Wait about 60 s; repeat queries are served from cache |
| `502 "Gemini rejected the API key"` | Missing, invalid or restricted key | Check `GEMINI_API_KEY` in `backend/.env` and restart the backend |
| `502 "Gemini model … is not available"` | Model ID is wrong or retired | Update `GEMINI_MODEL` / `GEMINI_FALLBACK_MODEL` |
| `502 "AI response was cut off"` | Output token budget too small | Keep `GEMINI_THINKING_LEVEL=MINIMAL` or raise the `GEMINI_MAX_TOKENS_*` values |
| `504 "AI provider timed out"` | Slow network or a slow model | Retry; raise `GEMINI_TIMEOUT_MS` if it keeps happening |
| `429 Too Many Requests` | Cardify's own rate limiter | Wait 60 s or raise `RATE_LIMIT_MAX` |
| "Cannot reach Cardify backend API" | Backend not running, or CORS mismatch | Start the backend on port 3000; check `CORS_ORIGINS` |
| MongoDB connection failed | Docker not running | Start Docker Desktop, then `docker compose up -d` |

Every error response includes a `requestId`. Search the backend logs for it to see the underlying Gemini status and message.

---

## 16. Limitations & Next Steps

- **Single-instance cache.** Replace `MemoryCacheService` with Redis to run multiple backend replicas.
- **No authentication yet.** Next steps are user accounts, workspaces and per-user history.
- **Streaming.** Server-Sent Events would show the cards as they are generated.
- **Experimentation.** A/B click-through tracking would test whether the AI-chosen winners actually convert better.
- **Deployment.** Runtime `.env` injection for static frontend builds across environments.

---

📘 More detail: [Backend Guide](./backend/README.md) · [Frontend Guide](./frontend/README.md)
