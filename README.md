# PharmaGuard — Pharmacogenomic Risk Prediction System

> RIFT 2026 Hackathon · Pharmacogenomics / Explainable AI Track

PharmaGuard analyzes a patient's genetic data (VCF file) and predicts personalized drug risks based on published CPIC clinical guidelines, with AI-generated explanations powered by Google Gemini.

---

## Links

| | |
|---|---|
| **Live Demo** | https://photonx-rift-2026.vercel.app |
| **Demo Video** | _LinkedIn video link — add after recording_ |
| **GitHub** | https://github.com/MonisMS/photonx-rift-2026 |

---

## What It Does

Upload a patient's `.vcf` file and select drugs. PharmaGuard:

1. Parses genetic variants from the VCF (GENE, STAR, RS info tags)
2. Determines diplotype and metabolizer phenotype per gene
3. Looks up CPIC guidelines to assign risk: **Safe / Adjust Dosage / Toxic / Ineffective / Unknown**
4. Calls Google Gemini to generate a plain-English clinical explanation
5. Returns a structured JSON report matching the required schema

Supported genes: `CYP2D6` `CYP2C19` `CYP2C9` `SLCO1B1` `TPMT` `DPYD`

Supported drugs: `CODEINE` `WARFARIN` `CLOPIDOGREL` `SIMVASTATIN` `AZATHIOPRINE` `FLUOROURACIL` `TRAMADOL` `OMEPRAZOLE` `CELECOXIB` `CAPECITABINE`

---

## Architecture

```
Browser
  └── FileReader parses .vcf text (avoids server upload size limits)
  └── Sends extracted variants JSON to API

POST /api/analyze  (Phase 1 — instant)
  └── lib/validator.ts  → validates every variant server-side
  └── lib/cpic.ts       → diplotype → phenotype → risk label + severity
  └── Returns CPICResult[] in < 200ms

POST /api/explain  (Phase 2 — single batched AI call)
  └── lib/gemini.ts     → builds ONE prompt containing all drugs, single API call
  └── lib/ai.ts         → waterfall: Gemini (4 keys × 2 models) → OpenRouter (free) → OpenAI (paid)
  └── Returns full AnalysisResult[] with llm_generated_explanation
```

The risk logic is **fully deterministic** (CPIC lookup tables). Gemini is used only for generating clinical explanations — it does not make the risk decision.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| AI | Google Gemini 2.0 Flash via Vercel AI SDK |
| Deployment | Vercel |

---

## Installation

```bash
# Clone the repo
git clone https://github.com/MonisMS/photonx-rift-2026
cd photonx-rift-2026

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Add your Gemini API keys to .env.local

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Setup

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_API_KEY_1` | Yes | Primary Gemini key — free at [aistudio.google.com](https://aistudio.google.com/apikey) |
| `GOOGLE_API_KEY_2..4` | No | Extra Gemini keys for rate-limit rotation (~30 req/day each) |
| `OPENROUTER_API_KEY` | No | Free fallback — Llama 3.3 70B, Llama 3.1 8B, Mistral 7B via [openrouter.ai](https://openrouter.ai/keys) |
| `OPENAI_API_KEY` | No | Paid last resort — gpt-4o-mini (~$0.0007 per 6-drug run) |

The AI provider waterfall is: **Gemini (free) → OpenRouter (free) → OpenAI (paid)**. Only `GOOGLE_API_KEY_1` is required; all others extend resilience. The app works fully even if Gemini is quota-exhausted.

---

## API Reference

### `POST /api/analyze`

Phase 1 — runs CPIC logic, returns instantly.

**Request:**
```json
{
  "patientId": "PATIENT_001",
  "variants": [
    { "gene": "CYP2D6", "starAllele": "*4", "rsid": "rs3892097" }
  ],
  "drugs": ["CODEINE", "WARFARIN"]
}
```

**Response:**
```json
{
  "results": [
    {
      "patient_id": "PATIENT_001",
      "drug": "CODEINE",
      "timestamp": "2026-02-19T10:00:00.000Z",
      "risk_assessment": {
        "risk_label": "Ineffective",
        "confidence_score": 0.7,
        "severity": "low"
      },
      "pharmacogenomic_profile": {
        "primary_gene": "CYP2D6",
        "diplotype": "*1/*4",
        "phenotype": "IM",
        "detected_variants": [
          { "rsid": "rs3892097", "gene": "CYP2D6", "star_allele": "*4" }
        ]
      },
      "clinical_recommendation": {
        "summary": "...",
        "action": "...",
        "alternative_drugs": ["Tramadol", "Morphine"],
        "guideline_reference": "CPIC Guideline for CYP2D6 and Codeine Therapy (2019 Update) — PMID: 31006110"
      },
      "quality_metrics": {
        "vcf_parsing_success": true,
        "variants_detected": 1,
        "genes_analyzed": ["CYP2D6"]
      }
    }
  ]
}
```

### `POST /api/explain`

Phase 2 — adds Gemini-generated clinical explanations to Phase 1 results.

**Request:** `{ "results": [ ...CPICResult ] }` (output from `/api/analyze`)

**Response:** Same structure with `llm_generated_explanation` added to each result:
```json
{
  "llm_generated_explanation": {
    "summary": "This patient is an Intermediate Metabolizer for CYP2D6...",
    "mechanism": "The rs3892097 variant in CYP2D6 (*4 allele) creates...",
    "recommendation": "Consider alternative analgesics per CPIC guidelines...",
    "citations": "CPIC Guideline for CYP2D6 and Codeine (PMID: 31006110); PharmGKB CYP2D6 summary"
  }
}
```

---

## Usage

1. Go to the live URL and click **Get Started**
2. Enter a **Patient ID**
3. Upload a `.vcf` file (drag & drop or file picker, max 5MB)
4. Select one or more drugs to analyze
5. Click **Analyze**
6. Risk badges appear instantly (Phase 1)
7. AI explanations load within 3–5 seconds (Phase 2)
8. Download as PDF clinical report, JSON, or copy to clipboard

Sample VCF files for testing are available on the analyze page.

---

## Risk Labels

| Risk Label | Meaning |
|---|---|
| **Safe** | Standard dosing appropriate |
| **Adjust Dosage** | Dose modification required — see recommendation |
| **Toxic** | Avoid this drug — dangerous accumulation risk |
| **Ineffective** | Drug cannot work — metabolic pathway non-functional |
| **Unknown** | Insufficient variant data for prediction |

---

## Known Limitations

- Covers 6 genes and 10 drugs (CYP2D6, CYP2C19, CYP2C9, SLCO1B1, TPMT, DPYD)
- CPIC tables include common star alleles; rare/novel combinations return `Unknown`
- Gemini explanation is informational — not a substitute for clinical pharmacist review
- Single-sample VCF only; multi-sample VCFs use the first sample column

---

## Team Members

| Name | Role |
|---|---|
| Member 1 | Lead Developer |
| Member 2 | Research & Domain |
| Member 3 | Design & Presentation |
| Member 4 | Documentation & Video |

---

*PharmaGuard · RIFT 2026 · For clinical research and educational use only*
