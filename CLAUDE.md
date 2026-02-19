# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project

**PharmaGuard** — RIFT 2026 Hackathon, Pharmacogenomics / Explainable AI Track.

A Next.js web app that takes a patient's `.vcf` genetic file + drug name(s) and returns a pharmacogenomic risk report (Safe / Adjust Dosage / Toxic / Ineffective) using deterministic CPIC lookup tables + Gemini-generated clinical explanations.

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
| AI SDK | Vercel AI SDK (`ai` + `@ai-sdk/google`) | ai 6.x |
| Gemini model | `gemini-2.0-flash` (default), `gemini-2.0-flash-lite` | — |
| Icons | lucide-react | — |
| Type safety | TypeScript strict mode | 5.x |

---

## Architecture

### Routes

| Route | File | Purpose |
|---|---|---|
| `GET /` | `app/page.tsx` | Landing page — "Get Started" links to `/analyze` |
| `GET /analyze` | `app/analyze/page.tsx` | Main analysis UI — all state and API calls |
| `POST /api/analyze` | `app/api/analyze/route.ts` | Phase 1: validates input + CPIC lookup → returns `CPICResult[]` instantly |
| `POST /api/explain` | `app/api/explain/route.ts` | Phase 2: takes `CPICResult[]`, adds Gemini explanations → returns `AnalysisResult[]` |
| `GET /api/test-keys` | `app/api/test-keys/route.ts` | Dev utility: verifies Gemini API keys are working |

### The core pipeline (how a request flows)

```
Browser: FileReader reads .vcf as text
       → lib/vcf-parser.ts extracts variants [{gene, starAllele, rsid}]
       → POST /api/analyze with {variants, drugs[], patientId}
       → renders risk badges instantly (Phase 1 done)
       → POST /api/explain → fills in Gemini explanations (Phase 2)

Server (Phase 1 — /api/analyze):
  lib/validator.ts   → validates variants/drugs/patientId
  lib/cpic.ts        → buildDiplotype → getPhenotype → getRisk + getConfidence
  → returns CPICResult[] (no LLM call here)

Server (Phase 2 — /api/explain):
  lib/gemini.ts      → explainAll(inputs) runs all Gemini calls via Promise.all
  lib/ai.ts          → getModel("flash") + round-robin key rotation
  → merges explanations into full AnalysisResult[]
```

### Critical architectural decisions

- **VCF is parsed in the browser** (FileReader API), not uploaded to the server. This avoids Vercel's 4.5MB body size limit (VCF files can be up to 5MB).
- **Gemini is used only for explanation generation**, not risk prediction. Risk is determined by `lib/cpic.ts` lookup tables — deterministic, matches test cases exactly.
- **All drug analyses run in parallel** via `Promise.all` in `lib/gemini.ts → explainAll()`.
- **Diplotype alleles are always sorted** (lower number first: `*1/*4` not `*4/*1`) to ensure consistent table matching.
- **If only one allele found** for a gene, `buildDiplotype` prepends `*1` (normal allele) as the other copy.
- **Phase 1 and Phase 2 are separate API calls**: the browser renders CPIC results immediately, then enriches them with explanations.

### Key files

| File | Purpose |
|---|---|
| `lib/types.ts` | All TypeScript interfaces — the JSON schema contract everything must follow |
| `lib/vcf-parser.ts` | Parses VCF text, extracts `GENE`, `STAR`, `RS` from INFO column |
| `lib/cpic.ts` | `DRUG_GENE_MAP`, diplotype→phenotype tables, phenotype+drug→risk tables for all 6 genes × 6 drugs |
| `lib/validator.ts` | Server-side validation of `variants`, `drugs`, and `patientId` before CPIC lookup |
| `lib/ai.ts` | Gemini provider: `getModel(key)` with 4-key round-robin rotation; `getKeyStatus()` for health check |
| `lib/gemini.ts` | Builds Gemini prompts, parses JSON responses, `explainAll()` runs all drugs in parallel |
| `lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |
| `app/api/analyze/route.ts` | Phase 1 orchestration — exports `CPICResult` type used by `/api/explain` |
| `app/api/explain/route.ts` | Phase 2 — merges Gemini explanations into full `AnalysisResult[]` |
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
| `sample_codeine_toxic.vcf` | CYP2D6 with `*4` variants (same diplotype, different patient ID) |
| `sample_multi_risk.vcf` | Multiple genes with risk variants — covers Adjust Dosage + Toxic cases |

---

## Environment Variables

```
GOOGLE_API_KEY_1=   # primary Gemini key (free, ~30 req/day)
GOOGLE_API_KEY_2=   # teammate key
GOOGLE_API_KEY_3=   # teammate key
GOOGLE_API_KEY_4=   # teammate key
OPENAI_API_KEY=     # paid fallback — gpt-4o-mini, ~$0.0003/run, optional
```

`lib/ai.ts` `generateWithFallback()` tries providers in this order:
1. Gemini `gemini-2.0-flash` — all 4 Google keys
2. Gemini `gemini-2.0-flash-lite` — all 4 Google keys
3. OpenAI `gpt-4o-mini` — only if `OPENAI_API_KEY` is set

All quota/429 errors are caught silently; the next provider is tried automatically. Hit `/api/test-keys` to verify which providers are live.

---

## shadcn/ui

Components are added via:
```bash
pnpm dlx shadcn@latest add <component-name>
```

Config is in `components.json`. Style is `new-york`, Tailwind v4, RSC-enabled. Installed components live in `components/ui/`. Uses unified `radix-ui` package (not `@radix-ui/react-*`).

---

## Deployment

Target: **Vercel**. All 4 `GOOGLE_API_KEY_*` vars must be set in the Vercel dashboard before the live URL will work. Deploy early (not at the end).
