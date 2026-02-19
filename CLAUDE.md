# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project

**PharmaGuard** — RIFT 2026 Hackathon, Pharmacogenomics / Explainable AI Track.

A Next.js web app that takes a patient's `.vcf` genetic file + drug name(s) and returns a pharmacogenomic risk report (Safe / Adjust Dosage / Toxic / Ineffective) using deterministic CPIC lookup tables + AI-generated clinical explanations.

Full domain knowledge, CPIC tables, data flow, and build plan are in `PLAN.md`. Read it before touching any logic files.

---

## Commands

```bash
pnpm dev          # start dev server (localhost:3000)
pnpm build        # production build
pnpm lint         # eslint
pnpm tsc --noEmit # type check without building
```

Package manager is **pnpm**. Never use npm or yarn.

---

## Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| UI library | React | 19.2.3 |
| Styling | Tailwind CSS v4 + shadcn/ui (new-york) | v4 |
| Animations | framer-motion | 12.x |
| AI SDK | Vercel AI SDK (`ai` + `@ai-sdk/google` + `@ai-sdk/openai`) | ai 6.x |
| Primary AI | Gemini `gemini-2.0-flash` → `gemini-2.0-flash-lite` (free) | — |
| Fallback AI | OpenRouter (free: Llama 70B/8B, Mistral 7B) → OpenAI `gpt-4o-mini` (paid) | — |
| PDF Export | jspdf + jspdf-autotable | 4.x |
| Icons | lucide-react | — |
| Type safety | TypeScript strict mode | 5.x |

---

## Architecture

### Routes

| Route | File | Purpose |
|---|---|---|
| `GET /` | `app/page.tsx` | Full landing page — hero, features, how-it-works, FAQ, footer |
| `GET /analyze` | `app/analyze/page.tsx` | Main analysis UI — all state, localStorage persistence, API calls |
| `POST /api/analyze` | `app/api/analyze/route.ts` | Phase 1: validates input + CPIC lookup → returns `CPICResult[]` instantly, zero AI calls |
| `POST /api/explain` | `app/api/explain/route.ts` | Phase 2 (batch, legacy): takes `CPICResult[]`, makes **1 batched AI call** → returns `AnalysisResult[]` |
| `POST /api/explain-single` | `app/api/explain-single/route.ts` | Phase 2 (parallel, primary): takes **1** `CPICResult`, returns **1** `AnalysisResult`. Client fires N in parallel for progressive card loading |
| `GET /api/test-keys` | `app/api/test-keys/route.ts` | Dev utility: verifies all configured AI providers are live |

### The core pipeline (how a request flows)

```
Browser: FileReader reads .vcf as text
       → lib/vcf-parser.ts extracts variants [{gene, starAllele, rsid}]
       → Gene phenotype heatmap rendered instantly (client-side CPIC lookup)
       → POST /api/analyze with {variants, drugs[], patientId}
       → Renders risk cards instantly (Phase 1 done, no AI involved)
       → N parallel POST /api/explain-single → cards fill progressively
       → All state persisted to localStorage (survives refresh)

Server (Phase 1 — /api/analyze):
  lib/validator.ts   → validates variants / drugs / patientId
  lib/cpic.ts        → buildDiplotype → getPhenotype → getRisk + getConfidence
  → returns CPICResult[] instantly, zero API calls

Server (Phase 2 — /api/explain-single × N in parallel):
  lib/gemini.ts      → buildSinglePrompt(1 drug) → small focused prompt
  lib/ai.ts          → generateWithFallback(prompt) → 1 API call per drug
  → each card fills independently as its response arrives (~2-3s for first)
```

### Critical architectural decisions

- **VCF is parsed in the browser** (FileReader API), not uploaded to the server. This avoids Vercel's 4.5MB body size limit (VCF files can be up to 5MB).
- **AI is used only for explanation generation**, not risk prediction. Risk is determined by `lib/cpic.ts` lookup tables — deterministic, matches test cases exactly.
- **Phase 2 uses parallel per-drug AI calls** (not one batched call). Each drug gets its own `/api/explain-single` request fired in parallel from the client. This means the first explanation appears in ~2-3s instead of waiting for all drugs to complete.
- **Provider waterfall in `generateWithFallback()`**: tries Gemini flash → Gemini flash-lite → OpenRouter (3 free models) → OpenAI gpt-4o-mini. Quota/429 errors are caught silently; the next provider is tried automatically.
- **Diplotype alleles are always sorted** (lower number first: `*1/*4` not `*4/*1`) to ensure consistent table matching.
- **If only one allele found** for a gene, `buildDiplotype` prepends `*1` (normal allele) as the other copy.
- **Phase 1 and Phase 2 are separate HTTP requests**: the browser renders CPIC results immediately, then enriches them with AI explanations progressively.
- **Session persistence via localStorage**: all state (patient ID, variants, drugs, results, AI explanations, metrics) is saved to `localStorage` under key `pharmaguard-session`. Sessions auto-expire after 24 hours. "New Analysis" button clears the session.
- **Gene phenotype heatmap computed client-side**: after VCF upload, `buildDiplotype()` and `getPhenotype()` from `lib/cpic.ts` run in the browser to show a per-gene phenotype preview before any API call.

### Key files

| File | Purpose |
|---|---|
| `lib/types.ts` | All TypeScript interfaces — the JSON schema contract everything must follow |
| `lib/vcf-parser.ts` | Parses VCF text, extracts `GENE`, `STAR`, `RS` from INFO column |
| `lib/cpic.ts` | `DRUG_GENE_MAP`, `CPIC_REFERENCES`, diplotype→phenotype tables, phenotype+drug→risk tables for 6 genes × 10 drugs |
| `lib/validator.ts` | Server-side validation of `variants`, `drugs`, and `patientId` before CPIC lookup |
| `lib/ai.ts` | `generateWithFallback(prompt)` — tries Gemini → OpenRouter → OpenAI. `getKeyStatus()` for health check |
| `lib/gemini.ts` | `explainSingle()` for per-drug prompts (primary); `explainAll()` for batch (legacy). Includes fallback explanations |
| `lib/pdf-report.ts` | `generatePDFReport()` — client-side PDF generation using jspdf + jspdf-autotable. Full clinical report layout |
| `lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |
| `app/api/analyze/route.ts` | Phase 1 orchestration — exports `CPICResult` type |
| `app/api/explain-single/route.ts` | Phase 2 (primary) — single drug explain, called N times in parallel |
| `app/api/explain/route.ts` | Phase 2 (legacy batch) — calls `explainAll()` once |
| `components/motion-primitives.tsx` | Reusable framer-motion wrappers: `FadeIn`, `FadeInSimple`, `StaggerContainer`, `StaggerItem`, `HoverLift`, `ScaleIn`, `AnimatedStat` |
| `components/vcf-upload.tsx` | Drag-and-drop VCF upload with AnimatePresence idle/dragging/success/error states |
| `components/drug-input.tsx` | Drug combobox with search, comma-separated batch add, brand name aliases, animated removable chips |
| `components/result-card.tsx` | Per-drug result card with risk badge, diplotype, animated confidence bar, structured AI explanation panel |

### Supported genes and their drugs
```
CYP2D6  → CODEINE, TRAMADOL
CYP2C19 → CLOPIDOGREL, OMEPRAZOLE
CYP2C9  → WARFARIN, CELECOXIB
SLCO1B1 → SIMVASTATIN
TPMT    → AZATHIOPRINE
DPYD    → FLUOROURACIL, CAPECITABINE
```

### Risk labels and severity levels
```
Safe          → severity: none
Adjust Dosage → severity: moderate or high
Toxic         → severity: high or critical
Ineffective   → severity: low or high
Unknown       → severity: none (no CPIC data for this phenotype)
```

### Confidence score rules
```
Both alleles identified in VCF  → 0.95
Only one allele identified      → 0.70
No alleles found for gene       → 0.30, phenotype = "Unknown"
```

---

## Design System

### Color tokens (app/globals.css)

All colors use `oklch()` — never add hardcoded hex values to components.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--primary` | `oklch(0.52 0.14 184.5)` | `oklch(0.65 0.14 184.5)` | Medical teal — CTAs, active states, icons |
| `--background` | `oklch(0.985 0.003 247)` | `oklch(0.09 0.018 248)` | Page background |
| `--card` | `oklch(1 0 0)` | `oklch(0.13 0.022 252)` | Card/panel surface |
| `--muted` | `oklch(0.96 0.004 247)` | `oklch(0.20 0.025 252)` | Subtle background fills |
| `--border` | `oklch(0.91 0.006 247)` | `oklch(0.22 0.020 252)` | Borders and dividers |
| `--accent` | `oklch(0.96 0.014 184.5)` | `oklch(0.22 0.045 184.5)` | Teal tint for backgrounds |

### Custom utility classes

```css
.shadow-card        /* subtle 2-layer elevation */
.shadow-card-md     /* medium elevation */
.shadow-card-lg     /* large elevation — hero CTAs, modals */
.hero-gradient      /* radial teal gradient for hero section background */
.eyebrow            /* section label — xs uppercase tracking-widest text-primary */
.gradient-text       /* teal gradient applied to text via background-clip */
.animate-cta-pulse  /* teal glow pulse for ready CTA button */
```

### Border radius

`--radius: 0.75rem` — use `rounded-xl` (0.75rem) as the standard card radius.

### Animation rules

- All animation components live in `components/motion-primitives.tsx`
- Every wrapper checks `useReducedMotion()` and degrades to a plain `<div>` when true
- `viewport={{ once: true, margin: "0px" }}` — triggers when element enters viewport
- **Hero section**: use `motion.div` with `animate` directly (not `whileInView`) since it's in the initial viewport on load
- **Below-fold sections**: use `FadeIn`, `StaggerContainer` / `StaggerItem` which use `whileInView`
- Do NOT use `whileInView` on elements that are visible on page load — they may not re-trigger
- **CTA pulse**: `.animate-cta-pulse` on the "Generate Pharmacogenomic Report" button when all inputs are filled. Respects `prefers-reduced-motion`.

### Landing page sections (`app/page.tsx`)

Full `"use client"` page. Sub-components (all defined in the same file):

| Component | Section |
|---|---|
| `TopNav` | Sticky nav — scroll-aware shadow, mobile hamburger with `AnimatePresence` |
| `HeroSection` | Headline, dual CTAs, stats grid — animates on mount (not whileInView) |
| `TrustBar` | Trust signal strip below hero |
| `HowItWorksSection` | 3-step numbered guide with connecting line |
| `FeaturesSection` | 6-card `HoverLift` grid |
| `SecuritySection` | 2-col card with privacy principle checklist |
| `TestimonialsSection` | 3 clinician quote cards |
| `FAQSection` | shadcn `Accordion` with 6 questions |
| `CTASection` | Teal full-width CTA panel |
| `FooterSection` | 4-column grid with legal disclaimer |

### Analyze page layout (`app/analyze/page.tsx`)

- **Sticky topbar** with back-to-home link, "Patient Analysis" badge, and "New Analysis" clear button
- **Warm title** with human subtitle ("Preventing adverse drug reactions...") and inline trust signals
- **Input card** with visual hierarchy:
  - Section 01 (Patient ID) — muted background, supporting role
  - Section 02 (VCF Upload) — teal left accent border, primary action, privacy badge, gene phenotype heatmap after upload
  - Section 03 (Drug Selection) — teal left accent border, combobox with chips
- **Readiness indicator** — green "Ready to generate report" bar when all inputs filled
- **"What happens next" guidance** — two-phase preview before clicking CTA
- **CTA button** — large, "Generate Pharmacogenomic Report", teal pulse animation when ready
- `PhaseIndicator` shows which phase (CPIC vs AI) is running
- **Results section**: performance metrics bar, partial genotype warning, drug comparison table, per-drug result cards with progressive AI explanation loading
- **System Architecture accordion** — appears below results only (collapsed by default)
- **Export options**: Download PDF (clinical report), Copy JSON, Download JSON
- **Session persistence**: all state saved to localStorage, survives page refresh, auto-expires after 24h

---

## Sample VCF Files

Located in `public/samples/` — linked from the analyze page:

| File | What it tests |
|---|---|
| `sample_all_normal.vcf` | All 6 genes as `*1` NM — all drugs Safe |
| `sample_codeine_pm.vcf` | CYP2D6 `*4/*4` (PM) — Codeine Ineffective |
| `sample_codeine_toxic.vcf` | CYP2D6 with `*4` variants (different patient ID) |
| `sample_multi_risk.vcf` | Multiple genes with risk variants — covers Adjust Dosage + Toxic cases |

---

## Environment Variables

```
GOOGLE_API_KEY_1=   # primary Gemini key (free, ~30 req/day per key)
GOOGLE_API_KEY_2=   # teammate key
GOOGLE_API_KEY_3=   # teammate key
GOOGLE_API_KEY_4=   # teammate key
OPENROUTER_API_KEY= # free fallback — Llama 3.3 70B, Llama 3.1 8B, Mistral 7B
OPENAI_API_KEY=     # paid last resort — gpt-4o-mini, ~$0.0007 per drug
```

`generateWithFallback()` in `lib/ai.ts` tries providers in this exact order:
1. `gemini-2.0-flash` × all 4 Google keys
2. `gemini-2.0-flash-lite` × all 4 Google keys
3. OpenRouter free models: Llama 3.3 70B → Llama 3.1 8B → Mistral 7B
4. `gpt-4o-mini` via `OPENAI_API_KEY` (only if set)
5. Returns `null` → `explainSingle()` uses fallback text, app still works

Hit `/api/test-keys` in the browser to see which providers are live and which keys are configured.

---

## AI Cost Reference

| Drugs selected | ~Tokens/drug | OpenAI cost/drug | $2 covers |
|---|---|---|---|
| 1 drug | ~300 | ~$0.00005 | ~40,000 runs |
| 6 drugs (parallel) | ~300 each | ~$0.0003 total | ~6,600 runs |
| 10 drugs (parallel) | ~300 each | ~$0.0005 total | ~4,000 runs |

OpenAI only activates after all Gemini + OpenRouter keys are exhausted. Real spend is minimal for a hackathon.

---

## shadcn/ui

Components are added via:
```bash
pnpm dlx shadcn@latest add <component-name>
```

Config is in `components.json`. Style is `new-york`, Tailwind v4, RSC-enabled. Installed components live in `components/ui/`. Uses unified `radix-ui` package (not `@radix-ui/react-*`).

Currently installed: `card`, `button`, `input`, `badge`, `separator`, `skeleton`, `progress`, `accordion`.

---

## Deployment

Target: **Vercel**. Set these env vars in the Vercel dashboard before going live:
- All 4 `GOOGLE_API_KEY_*` vars (free Gemini keys)
- `OPENROUTER_API_KEY` (free fallback — strongly recommended)
- `OPENAI_API_KEY` (paid last resort — recommended so the app works even when free providers are exhausted)
