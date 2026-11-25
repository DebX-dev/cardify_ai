# Cardify AI — Frontend (Angular 21 Zoneless + Tailwind v4 + Local Caching)

## 1. Overview
The Cardify AI frontend is a zoneless **Angular 21** single-page application styled with **Tailwind CSS v4** glassmorphism, `Fraunces` + `Inter` typography, animated SVG score rings, an inline SVG 5-axis radar chart, one-shot winner confetti, and dual-layer local caching (`localStorage` + signal store) for instantaneous repeat renders.

## 2. Prerequisites
- **Node.js 24 LTS** (Krypton)
- **Angular CLI 21** (installed locally via `npm install`)
- **Cardify AI Backend** running at `http://localhost:3000/api/v1`

## 3. Step-by-Step Setup
1. Copy the environment reference file:
   ```bash
   cd frontend
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Angular dev server:
   ```bash
   npx ng serve
   ```
4. Open the application in your browser:
   - **http://localhost:4200**

## 4. Step-by-Step UI Walkthrough
1. **Fill the Product Form**: Enter a **Product Name** (press `/` anytime to focus), **Category**, **Tone** (`Auto`, `Professional`, `Playful`, `Luxury`, `Minimal`, `Technical`), and optional **Extra Context** (up to 200 chars), or click a sample prompt on the empty state.
2. **Generate Details**: Click **Generate Details (3 Variants) →**. Repeat identical queries render instantaneously from browser `localStorage` cache (`⚡ Instant Browser Cache`), or click **Refresh from AI** to bypass cache.
3. **Read the Ranked Leaderboard**: The Winner Banner announces the top card (`aria-live="polite"`) with a one-shot confetti burst and `whyThisWon` rationale, followed by 3 ranked variant cards with animated radial score rings and verdict chips.
4. **Analyze SEO**: Click **Analyze Winner SEO** (or **SEO** on any variant card) to inspect top keyword density percentages and 3 missing high-intent keywords.
5. **Regenerate with Feedback**: Click **↻ Regenerate** on any card, type feedback (e.g. *"shorter, warmer"*), and re-score that single variant.
6. **Transform Tone**: Use the **Tone →** dropdown on any card to rewrite and re-score it in a different brand voice.
7. **Copy Exports & Print PDF**: Copy **JSON**, **Shopify JSON**, **Amazon Bullets**, or **Markdown** in one click, or click **Export PDF** (`window.print()`).
8. **History & Analytics Drawer**: Click **History** in the header to search past runs, view aggregated metrics, and reload any previous run instantaneously.

## 5. Folder Structure
```
frontend/src/
├── main.ts                       # Zoneless bootstrapApplication entry
├── styles.css                    # Tailwind v4 @theme, fonts, glassmorphism, print & motion rules
├── environments/                 # environment.ts & environment.prod.ts
└── app/
    ├── app.config.ts             # provideZonelessChangeDetection + functional HTTP interceptors
    ├── app.routes.ts             # Lazy generator feature route
    ├── core/                     # Typed models, ProductService, CacheService, HistoryService, Theme/Toast/Clipboard
    ├── shared/ui/                # Standalone OnPush UI primitives (score-ring, radar-chart, confetti, toast, etc.)
    └── features/generator/       # Signal store + product-form, variant-grid, variant-card, scorecard, winner, seo, history
```

## 6. Design Choices
- **Zoneless Angular 21 + Signals**: Uses `provideZonelessChangeDetection()`, `ChangeDetectionStrategy.OnPush`, `input()`/`output()`, `computed()`, and `effect()` without `zone.js`.
- **Browser Local Cache (`CacheService`)**: Persists normalized product runs, history, and SEO analyses in `localStorage` + memory for instant repeat renders while allowing explicit `Refresh from AI` bypass.
- **Glassmorphism & Typography Tokens**: Layered mesh background + `Fraunces` display headings + `Inter` UI copy via `@fontsource`.
- **Zero-Dependency SVG Radar & Canvas Confetti**: Pure inline SVG radar chart and lightweight canvas confetti avoid heavy charting/animation bundles.
- **Accessibility & Motion Policy**: Semantic landmarks, `for`/`id` label bindings, `aria-live="polite"` winner announcements, keyboard `Escape` + `/` shortcuts, and `prefers-reduced-motion` safeguards.
- **Dark Mode Persistence**: `ThemeService` cycles `system | light | dark`, persists in `localStorage`, and toggles `.dark` cleanly.
- **No Client-Side API Key**: Gemini credentials stay strictly on the NestJS backend.

## 7. AI Usage
### Runtime AI
- All AI inference is delegated to the NestJS backend (`/api/v1/runs*`). The frontend never stores or transmits any `GEMINI_API_KEY` and enforces strict TypeScript contracts (`Run`, `VariantScorecard`, `SeoAnalysis`) across every HTTP call.

### Development AI
- Frontend components and store scaffolded from `PROMPT.md`.
- Human-reviewed areas: WCAG AA contrast and focus-ring visibility, `prefers-reduced-motion` behavior on `ScoreRingComponent` and `ConfettiComponent`, and dual-layer cache invalidation after regeneration.

## 8. Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NG_APP_API_BASE_URL` | `http://localhost:3000/api/v1` | Backend REST API base URL |
| `NG_APP_APP_NAME` | `Cardify AI` | Application display name |
| `NG_APP_REQUEST_TIMEOUT_MS` | `90000` | HTTP request timeout in milliseconds |
| `NG_APP_ENABLE_DEBUG` | `true` | Enable development diagnostics |

## 9. Testing
```bash
# Run unit tests (Vitest via @angular/build:unit-test)
npm test

# Build production bundle
npm run build
```

## 10. Limitations & Next Steps
- `environment.ts` holds compile-time defaults; runtime `.env` injection can be added if deploying static builds across multiple environments.
- Next steps: live token streaming via SSE and side-by-side historical diffing.
