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
pnpm start        # start production server
pnpm lint         # eslint
pnpm tsc --noEmit # type check without building
pnpm test         # run vitest test suite once
pnpm test:watch   # run vitest in watch mode
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
| PDF Export | jspdf + jspdf-autotable | jspdf 4.x, autotable 5.x |
| Icons | lucide-react | — |
| Type safety | TypeScript strict mode | 5.x |
| CSS Animations | tw-animate-css | 1.x |
| Testing | Vitest | 4.x |

---

## Architecture

### Routes

| Route | File | Purpose |
|---|---|---|
| `GET /` | `app/page.tsx` | Landing page shell — imports 10 section components from `components/landing/` |
| `GET /analyze` | `app/analyze/page.tsx` | Main analysis UI — delegates state to `useAnalysisSession` hook |
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
- **Session persistence via localStorage**: all state logic extracted to `hooks/use-analysis-session.ts`. Saved under key `pharmaguard-session`, auto-expires after 24 hours. "New Analysis" button clears the session.
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
| `hooks/use-analysis-session.ts` | All analyze-page state, session persistence (localStorage), API calls (`handleAnalyze`), export actions (PDF/JSON/copy). The analyze page just calls `useAnalysisSession()` |
| `components/motion-primitives.tsx` | Reusable framer-motion wrappers: `FadeInUp`, `FadeIn`, `StaggerContainer` (`stagger?` prop), `StaggerItem`, `HoverLift` (`y?` prop). Also exports variant objects (`fadeInUpVariants`, etc.). Shared `EASE` and `VIEWPORT` constants. All check `useReducedMotion()` |
| `components/landing/data.ts` | Shared data constants for all landing sections: `NAV_LINKS`, `STATS`, `TRUST_ITEMS`, `STEPS`, `FEATURES`, `TESTIMONIALS`, `FAQS`, `FOOTER_LINKS` |
| `components/landing/*.tsx` | Landing page split into 10 section components: `top-nav`, `hero-section`, `trust-bar`, `how-it-works-section`, `features-section`, `security-section`, `testimonials-section`, `faq-section`, `cta-section`, `footer-section` |
| `components/analyze/step-progress.tsx` | 3-node horizontal progress flow — completion-driven (patientId / variants / drugs), animated checkmarks + connecting line fill |
| `components/analyze/analyze-topbar.tsx` | Sticky header with back link, PharmaGuard logo, "New Analysis" clear button, "Patient Analysis" badge |
| `components/analyze/phase-indicator.tsx` | Animated phase badge (CPIC analyzing / AI explaining) with `AnimatePresence` |
| `components/analyze/gene-heatmap.tsx` | Per-gene phenotype heatmap grid — client-side CPIC lookup, coverage/completeness badges |
| `components/analyze/analysis-results.tsx` | Results section: skeleton loading, result cards grid, drug comparison table, metrics bar, export buttons, system architecture accordion |
| `components/analyze/drug-comparison-table.tsx` | Scrollable multi-drug comparison table (Drug / Gene / Diplotype / Phenotype / Risk / Confidence), shown when 2+ results |
| `components/analyze/result-skeleton.tsx` | Loading skeleton placeholder card matching `ResultCard` shape, shown during analyzing phase |
| `components/vcf-upload.tsx` | Drag-and-drop VCF upload with floating icon animation, drag-over glow ring, success scale pulse, error shake, `useReducedMotion()` |
| `components/drug-input.tsx` | Drug combobox with search, comma-separated batch add, brand name aliases, animated pill chips (`rounded-full`), "N drugs selected" badge, soft hover tints |
| `components/result-card.tsx` | Per-drug result card with risk badge, diplotype, animated confidence bar, structured AI explanation panel |
| `__tests__/*.test.ts` | Vitest test suite: `cpic.test.ts`, `vcf-parser.test.ts`, `validator.test.ts`, `integration.test.ts` |
| `vitest.config.ts` | Vitest configuration with `@` alias pointing to repo root |

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

### CSS imports (app/globals.css)

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
```

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
.shadow-card            /* subtle 2-layer elevation */
.shadow-card-md         /* medium elevation */
.shadow-card-lg         /* large elevation — hero CTAs, modals */
.hero-gradient          /* radial teal gradient for hero section background */
.eyebrow                /* section label — xs uppercase tracking-widest text-primary */
.gradient-text          /* teal gradient applied to text via background-clip */
.hero-gradient-text     /* bright teal-cyan gradient text for hero (visible on dark bg) */
.animate-cta-pulse      /* teal glow pulse for landing CTA button */
.bg-noise               /* SVG fractalNoise texture overlay (3% opacity, mix-blend-mode overlay) */
.section-border-top     /* centered gradient border line between dark sections (white glow) */
.section-border-top-light /* variant for light sections (dark gradient) */
.border-glow            /* neon teal glow border for dark-mode cards */
.bg-dot-grid            /* molecular dot-grid overlay for hero (animated drift) */
.bg-dna-helix           /* DNA helix line art texture for hero/CTA backgrounds */
.bg-dna-subtle          /* subtle deep-green DNA helix texture for analyze page (lg+ only, 4% opacity) */
.btn-clinical           /* clinical CTA button — inner shadow highlight + outer shadow, hover shadow grow */
.animate-shimmer-clinical /* sweeping white gradient shimmer for loading button state */
.focus-brand             /* custom teal focus ring */
.animate-marquee         /* infinite marquee scroll animation */
.hero-glow-orb           /* animated glow orb for hero (8s breathing) */
.hero-glow-orb-2         /* second glow orb for hero (12s breathing) */
```

### Page gradient tokens (landing page, dark→light top→bottom)

```
--pg-hero        oklch(0.16 0.065 170)  — hero section background
--pg-hero-mid    oklch(0.18 0.075 168)  — hero bottom gradient
--pg-trust       oklch(0.21 0.072 168)  — trust bar
--pg-deep        oklch(0.28 0.060 168)  — how-it-works section
--pg-mid         oklch(0.40 0.050 168)  — features section
--pg-mid-light   oklch(0.55 0.040 168)  — unused (available for future sections)
--pg-light       oklch(0.70 0.030 168)  — security section
--pg-lighter     oklch(0.82 0.020 167)  — testimonials section
--pg-near-white  oklch(0.92 0.010 167)  — FAQ + CTA sections
```

Gradient bridge `<div>`s in `app/page.tsx` smooth transitions between adjacent tokens.

### Border radius

`--radius: 0.75rem` — use `rounded-xl` (0.75rem) as the standard card radius.

### Animation rules

- All reusable animation components live in `components/motion-primitives.tsx`
- Shared constants: `EASE = [0.16, 1, 0.3, 1]`, `VIEWPORT = { once: true, margin: "-60px" }`
- Every wrapper checks `useReducedMotion()` and degrades to a plain `<div>` when true
- **Hero section**: use `motion.div` with `animate` directly (not `whileInView`) since it's in the initial viewport on load. Mouse-driven parallax on DNA/dot-grid background (max ±8px, rAF throttled, disabled on mobile/<768px). Scroll-driven glow opacity fade (0.55→0.20 over 600px).
- **Below-fold sections**: use `FadeInUp`, `FadeIn`, `StaggerContainer` / `StaggerItem` which use `whileInView`
- **Section headers**: cinematic clip-masked headline reveal (overflow-hidden + `y:"100%"→"0%"`)
- **Feature/step cards**: single `motion.div` per card with combined `whileInView` + `whileHover` (no nested motion divs). Icon hover via CSS `group-hover:rotate-2 group-hover:scale-105 group-hover:drop-shadow`
- **Testimonial cards**: fixed-angle hover tilt (`rotateX:2, rotateY:-2`), perspective container, marquee with pause-on-hover
- **FAQ**: custom Framer Motion `AnimatePresence` accordion (not shadcn), animated height + chevron rotation
- **Section depth**: `bg-noise` for subtle texture, `section-border-top` for edge glow between sections, `z-[2]` on content wrappers above noise pseudo-element
- Do NOT use `whileInView` on elements that are visible on page load — they may not re-trigger
- **Landing CTA pulse**: `.animate-cta-pulse` on landing page CTA button. Respects `prefers-reduced-motion`.
- **Analyze page motion system** (mount-based, not scroll-triggered):
  - Page title: `opacity: 0→1, y: 20→0`, 0.5s easeOut on mount
  - Card container: `opacity: 0→1, scale: 0.98→1`, 0.4s easeOut, 0.1s delay
  - Sections stagger via `section(index)` helper: `BASE_DELAY(0.15) + index * STAGGER(0.08)`, each `opacity: 0→1, y: 20→0`, 0.5s easeOut
  - Section hover: `whileHover: { y: -4 }` + CSS `hover:shadow-md transition-shadow`
  - Clinical CTA button: `motion.button` with `whileHover: { y: -2 }`, `whileTap: { scale: 0.98 }`, spring transition (`stiffness: 400, damping: 17`). Shimmer overlay during loading.
  - All gated by `useReducedMotion()` — `initial: false` skips entrance, `whileHover: undefined` skips hover
- **VCF upload states**: idle icon floats (`y: [0, -3, 0]` 2.5s loop), drag-over scales icon to 1.08, success has scale pulse `[0.92, 1.04, 1]`, error has shake `x: [0, -3, 3, -3, 3, 0]`

### Landing page sections

`app/page.tsx` is a server component that imports from `components/landing/*.tsx`. Each section is a separate `"use client"` file. Shared data lives in `components/landing/data.ts`.

| File | Component | Section |
|---|---|---|
| `top-nav.tsx` | `TopNav` | Sticky nav — progressive blur/shadow on scroll, capsule active indicator, mobile hamburger with `AnimatePresence` |
| `hero-section.tsx` | `HeroSection` | Layered entrance animation, mouse-driven parallax, scroll-driven glow fade, dual CTAs, stats grid |
| `trust-bar.tsx` | `TrustBar` | Trust signal strip below hero (5 items with icons) |
| `how-it-works-section.tsx` | `HowItWorksSection` | 3-step cards with connecting line, staggered scroll reveal, hover lift |
| `features-section.tsx` | `FeaturesSection` | 6-card grid, single motion.div per card, standardized icon hover (CSS rotate/scale/drop-shadow), 2 "Core" featured cards |
| `security-section.tsx` | `SecuritySection` | 2-col card — text + animated privacy principle checklist with staggered check marks |
| `testimonials-section.tsx` | `TestimonialsSection` | 6 clinician quote cards in infinite marquee, fixed-angle hover tilt, pause-on-hover |
| `faq-section.tsx` | `FAQSection` | 6 questions — custom Framer Motion AnimatePresence accordion (not shadcn), animated height + chevron rotation |
| `cta-section.tsx` | `CTASection` | Teal full-width CTA panel with DNA helix texture |
| `footer-section.tsx` | `FooterSection` | 4-column grid with RIFT 2026 badge and legal disclaimer |

### Analyze page layout (`app/analyze/page.tsx`)

- **Sticky topbar** (`AnalyzeTopbar`) with back-to-home link, PharmaGuard logo, "New Analysis" clear button, "Patient Analysis" badge
- **Page title** — 28px semibold, subtitle with Heart icon, inline trust signals (13px)
- **DNA background texture** — `.bg-dna-subtle` on page root (deep green helix, 4% opacity, lg+ only), content at `relative z-[1]`
- **Input card** — scale 0.98→1 mount animation, `shadow-card-md`:
  - **Step progress flow** (`StepProgress`) at top — 3 connected nodes driven by `patientId` / `variants` / `selectedDrugs` completion state
  - **Section headers**: two-tier — 14px uppercase muted eyebrow + 18px bold title (e.g. "GENETIC DATA" / "VCF File Upload")
  - Section 01 (Patient ID) — muted background, supporting role
  - Section 02 (VCF Upload) — teal left accent border, privacy badge, VCF drop zone with floating/drag/success/error animations, gene phenotype heatmap after upload
  - Section 03 (Drug Selection) — teal left accent border, combobox with pill chips, "N drugs selected" badge, soft hover tints
  - Each section: staggered entrance (0.08s apart), hover lift -4px + shadow-md
- **Readiness indicator** — green "Ready to run analysis" bar when all inputs filled
- **"What happens next" guidance** — two-phase preview before clicking CTA
- **Clinical CTA button** — `motion.button` "Run Clinical Risk Analysis" with Activity icon, `bg-emerald-800`, `.btn-clinical` inner/outer shadow, hover translateY(-2px) + shadow grow, loading shimmer overlay + "Analyzing…", disabled opacity 50%
- `PhaseIndicator` shows which phase (CPIC vs AI) is running
- **Results section** (`AnalysisResults`): performance metrics bar, partial genotype warning, drug comparison table, per-drug result cards with progressive AI explanation loading
- **System Architecture accordion** — appears below results only (collapsed by default)
- **Export options**: Download PDF (clinical report), Copy JSON, Download JSON
- **Session persistence**: all state managed by `useAnalysisSession()` hook, saved to localStorage, survives page refresh, auto-expires after 24h

### Analyze page typography hierarchy

| Element | Size | Weight | Color |
|---|---|---|---|
| Page title | 28px | semibold | `text-foreground` |
| Subtitle | 14px (sm) | normal | `text-muted-foreground` |
| Trust signals | 13px | normal | `text-muted-foreground` |
| Section eyebrow | 14px (sm) | medium | `text-muted-foreground` uppercase tracking-widest |
| Section title | 18px (lg) | bold | `text-foreground` |
| Form labels | 12px (xs) | semibold | `text-foreground` |
| Helper text | 13px | normal | `text-muted-foreground` |
| Badges / micro text | 10–11px | semibold | contextual |
| CTA button | 14px (sm) | bold | white on emerald-800 |

---

## Sample VCF Files

Located in `public/samples/` — linked from the analyze page:

| File | What it tests |
|---|---|
| `sample_all_normal.vcf` | All 6 genes as `*1` NM — all drugs Safe |
| `sample_codeine_pm.vcf` | CYP2D6 `*4/*4` (PM) — Codeine Ineffective |
| `sample_codeine_toxic.vcf` | CYP2D6 with `*4` variants (different patient ID) |
| `sample_multi_risk.vcf` | Multiple genes with risk variants — covers Adjust Dosage + Toxic cases |
| `sample_mixed_coverage.vcf` | Mixed allele coverage across genes — tests partial genotype handling |
| `sample_urm.vcf` | Ultra-rapid metabolizer variants — tests URM phenotype paths |
| `sample_worst_case.vcf` | Worst-case risk variants across all genes — stress test for highest severity |

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
