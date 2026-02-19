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
| Fallback AI | OpenAI `gpt-4o-mini` (paid, last resort) | — |
| Icons | lucide-react | — |
| Type safety | TypeScript strict mode | 5.x |

---

## Architecture

### Routes

| Route | File | Purpose |
|---|---|---|
| `GET /` | `app/page.tsx` | Full landing page — hero, features, how-it-works, FAQ, footer |
| `GET /analyze` | `app/analyze/page.tsx` | Main analysis UI — all state and API calls |
| `POST /api/analyze` | `app/api/analyze/route.ts` | Phase 1: validates input + CPIC lookup → returns `CPICResult[]` instantly, zero AI calls |
| `POST /api/explain` | `app/api/explain/route.ts` | Phase 2: takes `CPICResult[]`, makes **1 batched AI call** → returns `AnalysisResult[]` |
| `GET /api/test-keys` | `app/api/test-keys/route.ts` | Dev utility: verifies all configured AI providers are live |

### The core pipeline (how a request flows)

```
Browser: FileReader reads .vcf as text
       → lib/vcf-parser.ts extracts variants [{gene, starAllele, rsid}]
       → POST /api/analyze with {variants, drugs[], patientId}
       → renders risk cards instantly (Phase 1 done, no AI involved)
       → POST /api/explain → fills in AI explanations (Phase 2)

Server (Phase 1 — /api/analyze):
  lib/validator.ts   → validates variants / drugs / patientId
  lib/cpic.ts        → buildDiplotype → getPhenotype → getRisk + getConfidence
  → returns CPICResult[] instantly, zero API calls

Server (Phase 2 — /api/explain):
  lib/gemini.ts      → buildBatchPrompt(all drugs) → single prompt string
  lib/ai.ts          → generateWithFallback(prompt) → 1 API call total
  → merges explanations[N] into full AnalysisResult[]
```

### Critical architectural decisions

- **VCF is parsed in the browser** (FileReader API), not uploaded to the server. This avoids Vercel's 4.5MB body size limit (VCF files can be up to 5MB).
- **AI is used only for explanation generation**, not risk prediction. Risk is determined by `lib/cpic.ts` lookup tables — deterministic, matches test cases exactly.
- **All drugs are batched into a single AI call** regardless of how many are selected. The prompt includes all N drugs and expects a JSON array of N objects back. This is 1 API call whether you select 1 drug or all 6.
- **Provider waterfall in `generateWithFallback()`**: tries Gemini flash → Gemini flash-lite → OpenAI gpt-4o-mini. Quota/429 errors are caught silently; the next provider is tried automatically.
- **Diplotype alleles are always sorted** (lower number first: `*1/*4` not `*4/*1`) to ensure consistent table matching.
- **If only one allele found** for a gene, `buildDiplotype` prepends `*1` (normal allele) as the other copy.
- **Phase 1 and Phase 2 are separate HTTP requests**: the browser renders CPIC results immediately, then enriches them with AI explanations.

### Key files

| File | Purpose |
|---|---|
| `lib/types.ts` | All TypeScript interfaces — the JSON schema contract everything must follow |
| `lib/vcf-parser.ts` | Parses VCF text, extracts `GENE`, `STAR`, `RS` from INFO column |
| `lib/cpic.ts` | `DRUG_GENE_MAP`, diplotype→phenotype tables, phenotype+drug→risk tables for all 6 genes × 6 drugs |
| `lib/validator.ts` | Server-side validation of `variants`, `drugs`, and `patientId` before CPIC lookup |
| `lib/ai.ts` | `generateWithFallback(prompt)` — tries all Gemini keys + models, then OpenAI. `getKeyStatus()` for health check |
| `lib/gemini.ts` | `buildBatchPrompt()` compacts all drugs into one prompt; `explainAll()` makes 1 API call and parses JSON array |
| `lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |
| `app/api/analyze/route.ts` | Phase 1 orchestration — exports `CPICResult` type used by `/api/explain` |
| `app/api/explain/route.ts` | Phase 2 — calls `explainAll()` once, merges results into full `AnalysisResult[]` |
| `components/motion-primitives.tsx` | Reusable framer-motion wrappers: `FadeIn`, `FadeInSimple`, `StaggerContainer`, `StaggerItem`, `HoverLift`, `ScaleIn`, `AnimatedStat` |
| `components/vcf-upload.tsx` | Drag-and-drop VCF upload with AnimatePresence idle/dragging/success/error states |
| `components/drug-input.tsx` | Drug selection grid — 6 toggle cards with category badges and animated check indicator |
| `components/result-card.tsx` | Per-drug result card with risk badge, diplotype, animated confidence bar, AI explanation accordion |

### Supported genes and their drugs
```
CYP2D6  → CODEINE
CYP2C19 → CLOPIDOGREL
CYP2C9  → WARFARIN
SLCO1B1 → SIMVASTATIN
TPMT    → AZATHIOPRINE
DPYD    → FLUOROURACIL
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
.shadow-card      /* subtle 2-layer elevation */
.shadow-card-md   /* medium elevation */
.shadow-card-lg   /* large elevation — hero CTAs, modals */
.hero-gradient    /* radial teal gradient for hero section background */
.eyebrow          /* section label — xs uppercase tracking-widest text-primary */
.gradient-text    /* teal gradient applied to text via background-clip */
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

- **Sticky topbar** with back-to-home link and "Patient Analysis" badge
- **Input card** with three numbered sections (01 Patient Details / 02 Genetic Data / 03 Drug Selection)
- `PhaseIndicator` component shows which phase (CPIC vs AI) is running, with description
- Results appear below with staggered card mount animations
- `AnimatePresence` gates the skeleton cards (phase=analyzing) and results (phase=explaining|done)

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
OPENAI_API_KEY=     # paid fallback — gpt-4o-mini, ~$0.0007 per 6-drug run
```

`generateWithFallback()` in `lib/ai.ts` tries providers in this exact order:
1. `gemini-2.0-flash` × all 4 Google keys
2. `gemini-2.0-flash-lite` × all 4 Google keys
3. `gpt-4o-mini` via `OPENAI_API_KEY` (only if set)
4. Returns `null` → `explainAll()` uses fallback text, app still works

Hit `/api/test-keys` in the browser to see which providers are live and which keys are configured.

---

## AI Cost Reference

| Drugs selected | ~Tokens/run | OpenAI cost/run | $2 covers |
|---|---|---|---|
| 1 drug | ~600 | ~$0.0001 | ~20,000 runs |
| 6 drugs (all) | ~1,070 | ~$0.0007 | ~2,800 runs |

OpenAI only activates after all Gemini keys are quota-exhausted. Real spend is minimal for a hackathon.

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
- `OPENAI_API_KEY` (paid fallback — strongly recommended so the app works even when Gemini is exhausted)
