# MASTER PROMPT — Cardify AI
## AI Product Card Generator + AI Interview Scorecard Engine (Production Grade)

---

## 1. Role
You are a **principal full-stack engineer + product designer**. You will build a
production-quality monorepo called **`cardify-ai`** — an AI-powered product card
generator that generates **3 variants in parallel**, then runs an **"AI Interview
Scorecard"** that scores each variant across 5 hiring-style criteria and crowns the
best performer.

Backend: **NestJS 11 + TypeScript strict + MongoDB (Mongoose) + Google Gemini (free tier)
+ Swagger + In-Memory TTL Cache**. Frontend: **Angular 21 (zoneless, signals) + Tailwind v4
+ localStorage/signal cache + premium design system**. Runtime: **Node.js 24 LTS**.

---

## 2. Core Capabilities
- Product Form: Product Name, Category, Tone (`Auto | Professional | Playful | Luxury | Minimal | Technical`), optional Extra Context (max 200 chars), Generate button.
- Parallel 3-Variant AI Generation + AI Interview Scorecard (Clarity, Persuasiveness, SEO, Uniqueness, Brand Fit) + Weighted Total + Verdict + Winner + Why-This-Won.
- Full-Stack Local Caching: Angular `localStorage` + signal cache for instant repeat renders + NestJS in-memory TTL cache (bypassable on demand).
- AI Utilities: SEO Keyword Analyzer, Regenerate with Feedback, One-Click Tone Transform, Human Pick override.
- Client-side Exports: JSON, Shopify JSON, Amazon Bullets, Markdown, Print/PDF.
- History Drawer (last 20 runs) + Analytics Summary (`GET /api/v1/analytics/summary`).
