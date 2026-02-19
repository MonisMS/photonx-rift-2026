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

## Architecture

### The core pipeline (how a request flows)

```
Browser: FileReader reads .vcf as text
       → lib/vcf-parser.ts extracts variants [{gene, star, rsid}]
       → POST /api/analyze with {variants, drugs[], patientId}

Server: lib/cpic.ts → diplotype → phenotype → risk label + severity
      + lib/ai.ts  → Gemini generates clinical explanation (parallel, one call per drug)
      → returns AnalysisResult[] matching exact JSON schema from PLAN.md
```

### Critical architectural decisions

- **VCF is parsed in the browser** (FileReader API), not uploaded to the server. This avoids Vercel's 4.5MB body size limit (VCF files can be up to 5MB).
- **Gemini is used only for explanation generation**, not risk prediction. Risk is determined by `lib/cpic.ts` lookup tables — deterministic, matches test cases exactly.
- **All drug analyses run in parallel** via `Promise.all` to avoid slow sequential Gemini calls.
- **Diplotype alleles are always sorted** (lower number first: `*1/*4` not `*4/*1`) to ensure consistent test case matching.

### Key files

| File | Purpose |
|---|---|
| `lib/types.ts` | All TypeScript interfaces — the JSON schema contract everything must follow |
| `lib/vcf-parser.ts` | Parses VCF text, extracts `GENE`, `STAR`, `RS` from INFO column |
| `lib/cpic.ts` | DRUG_GENE_MAP, diplotype→phenotype tables, phenotype+drug→risk tables for all 6 genes × 6 drugs |
| `lib/ai.ts` | Gemini provider with 4-key round-robin rotation + fallback on 429 |
| `app/api/analyze/route.ts` | Orchestrates the full pipeline, returns `AnalysisResult[]` |

### Supported genes and their drugs
```
CYP2D6  → CODEINE
CYP2C19 → CLOPIDOGREL
CYP2C9  → WARFARIN
SLCO1B1 → SIMVASTATIN
TPMT    → AZATHIOPRINE
DPYD    → FLUOROURACIL
```

### Confidence score rules
```
Both alleles identified in VCF  → 0.95
Only one allele identified      → 0.70
No alleles found for gene       → 0.30, phenotype = "Unknown"
```

---

## Environment Variables

```
GOOGLE_API_KEY_1=   # primary Gemini key
GOOGLE_API_KEY_2=   # teammate key
GOOGLE_API_KEY_3=   # teammate key
GOOGLE_API_KEY_4=   # teammate key
```

`lib/ai.ts` automatically rotates across all non-empty keys. If a key hits a 429 rate limit, it silently falls back to the next key.

---

## shadcn/ui

Components are added via:
```bash
pnpm dlx shadcn@latest add <component-name>
```

Config is in `components.json`. Style is `new-york`, Tailwind v4, RSC-enabled. Installed components live in `components/ui/`.

---

## Deployment

Target: **Vercel**. All 4 `GOOGLE_API_KEY_*` vars must be set in the Vercel dashboard before the live URL will work. Deploy early (not at the end).
