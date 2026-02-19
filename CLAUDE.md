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
| `GET /` | `app/page.tsx` | Landing page — "Get Started" links to `/analyze` |
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
| `components/vcf-upload.tsx` | Drag-and-drop VCF file upload, parses in browser via FileReader |
| `components/drug-input.tsx` | Drug selection grid (toggle buttons for all 6 supported drugs) |
| `components/result-card.tsx` | Per-drug result card with risk badge, diplotype, confidence bar, AI explanation accordion |

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

---

## Deployment

Target: **Vercel**. Set these env vars in the Vercel dashboard before going live:
- All 4 `GOOGLE_API_KEY_*` vars (free Gemini keys)
- `OPENAI_API_KEY` (paid fallback — strongly recommended so the app works even when Gemini is exhausted)
