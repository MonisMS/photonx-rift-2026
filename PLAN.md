# PharmaGuard — Complete Build Plan
## RIFT 2026 Hackathon | Pharmacogenomics / Explainable AI Track

---

## 1. What Are We Actually Building?

A web app where a doctor uploads a patient's genetic data file (.vcf) and types in a drug name. The app tells them whether that drug is **safe, needs dose adjustment, will be ineffective, or will be toxic** for that specific patient — based on their DNA.

The output is a clinical report with color-coded risk labels, a plain-English AI explanation, and a downloadable JSON file.

**The pitch:** "We give doctors a 30-second genetic risk report for any drug, powered by 50 years of clinical research and AI."

---

## 2. Domain Knowledge (Read Before Coding)

### What is Pharmacogenomics?
Some people metabolize (process) drugs differently based on their DNA. Same drug, same dose — one person is fine, another dies. This happens because enzymes in your body process drugs, and those enzymes are made by genes. If your gene is broken, your enzyme is broken, and the drug doesn't work as expected.

### What is a VCF File?
VCF = Variant Call Format. It's a plain text file listing every place where this patient's DNA differs from the "normal" reference genome. Think of it as a git diff for DNA.

**For our purposes:** The problem guarantees VCF files are pre-annotated with 3 INFO tags we care about:
```
GENE=CYP2D6    → which gene this variant is in
STAR=*4        → which star allele version this is
RS=rs3892097   → universal rsID for this variant
```
This means VCF parsing = reading a text file and extracting these 3 values per variant row. No bioinformatics library needed.

### What are Star Alleles?
Each gene has named versions called star alleles:
- `*1` = always the normal, working version
- `*2`, `*4`, `*5`... = mutated versions with different function levels

### What is a Diplotype?
You have 2 copies of every gene (one from each parent). A diplotype = your 2 star alleles combined. Example: `*1/*4`

### What is a Phenotype?
Based on your diplotype, you're classified as:
| Label | Meaning |
|---|---|
| **PM** — Poor Metabolizer | Can't process the drug (both genes broken) |
| **IM** — Intermediate Metabolizer | Processes slowly (one impaired copy) |
| **NM** — Normal Metabolizer | Works normally |
| **RM** — Rapid Metabolizer | Processes faster than normal |
| **URM** — Ultrarapid Metabolizer | Processes extremely fast |

### What is CPIC?
Clinical Pharmacogenomics Implementation Consortium. A group of scientists who publish free, peer-reviewed guidelines that say: "If patient has phenotype X for gene Y, and takes drug Z, do this." These are deterministic lookup tables — not ML, not guessing. We implement these as code.

---

## 3. The 6 Genes × 6 Drugs — Complete CPIC Tables

### Gene: CYP2D6 → Drug: CODEINE
CYP2D6 converts codeine into morphine. Too slow = ineffective. Too fast = toxic morphine buildup.

**Star Allele → Phenotype:**
| Diplotype Examples | Phenotype |
|---|---|
| *1/*1, *1/*2, *2/*2 | NM |
| *1/*4, *1/*5, *1/*6, *1/*10, *1/*41 | IM |
| *4/*4, *4/*5, *5/*5, *4/*6 | PM |
| *1xN/*1, *2xN/*1, *2xN/*2 | URM |

**Phenotype → Risk:**
| Phenotype | Risk Label | Severity | Reason |
|---|---|---|---|
| PM | Ineffective | Low | Can't convert codeine to morphine — no pain relief |
| IM | Adjust Dosage | Moderate | Slower conversion — monitor closely |
| NM | Safe | None | Normal conversion |
| URM | Toxic | Critical | Too much morphine produced too fast — respiratory depression risk |

---

### Gene: CYP2C19 → Drug: CLOPIDOGREL
CYP2C19 activates clopidogrel (a blood thinner). Can't activate it = blood clots still form.

**Star Allele → Phenotype:**
| Diplotype Examples | Phenotype |
|---|---|
| *1/*1 | NM |
| *1/*2, *1/*3 | IM |
| *2/*2, *2/*3, *3/*3 | PM |
| *1/*17 | RM |
| *17/*17 | URM |

**Phenotype → Risk:**
| Phenotype | Risk Label | Severity | Reason |
|---|---|---|---|
| PM | Ineffective | High | Drug never activates — no antiplatelet effect — heart attack risk |
| IM | Adjust Dosage | Moderate | Reduced activation — consider alternative |
| NM | Safe | None | Normal activation |
| RM | Safe | None | Slightly increased activation, generally fine |
| URM | Adjust Dosage | Low | Higher active metabolite levels |

---

### Gene: CYP2C9 → Drug: WARFARIN
CYP2C9 breaks down warfarin (a blood thinner). Can't break it down = too much warfarin = internal bleeding.

**Star Allele → Phenotype:**
| Diplotype Examples | Phenotype |
|---|---|
| *1/*1 | NM |
| *1/*2, *1/*3 | IM |
| *2/*2, *2/*3, *3/*3 | PM |

**Phenotype → Risk:**
| Phenotype | Risk Label | Severity | Reason |
|---|---|---|---|
| PM | Adjust Dosage | High | Drug accumulates — major bleeding risk — needs 50-70% dose reduction |
| IM | Adjust Dosage | Moderate | Slower clearance — needs 25-50% dose reduction |
| NM | Safe | None | Normal clearance |

---

### Gene: SLCO1B1 → Drug: SIMVASTATIN
SLCO1B1 transports simvastatin (cholesterol drug) into liver cells. Broken transporter = drug stays in blood = muscle breakdown.

**Star Allele → Phenotype:**
| Diplotype Examples | Phenotype (Function) |
|---|---|
| *1a/*1a, *1a/*1b, *1b/*1b | Normal Function |
| *1a/*5, *1b/*5, *1a/*15, *1b/*15 | Decreased Function |
| *5/*5, *15/*15, *5/*15 | Poor Function |

**Phenotype → Risk:**
| Phenotype | Risk Label | Severity | Reason |
|---|---|---|---|
| Poor Function | Toxic | High | Drug can't enter liver — myopathy (muscle damage) risk |
| Decreased Function | Adjust Dosage | Moderate | Reduced transport — use lower dose or switch to pravastatin |
| Normal Function | Safe | None | Normal transport |

---

### Gene: TPMT → Drug: AZATHIOPRINE
TPMT breaks down azathioprine (immune suppressant). Can't break it down = drug builds up = destroys bone marrow.

**Star Allele → Phenotype:**
| Diplotype Examples | Phenotype |
|---|---|
| *1/*1 | NM |
| *1/*2, *1/*3A, *1/*3B, *1/*3C | IM |
| *2/*3A, *3A/*3A, *3A/*3C, *2/*3C | PM |

**Phenotype → Risk:**
| Phenotype | Risk Label | Severity | Reason |
|---|---|---|---|
| PM | Toxic | Critical | Bone marrow toxicity — life-threatening |
| IM | Adjust Dosage | High | Start at 30-70% of standard dose |
| NM | Safe | None | Normal metabolism |

---

### Gene: DPYD → Drug: FLUOROURACIL
DPYD breaks down fluorouracil (chemotherapy). Can't break it down = chemo drug accumulates = fatal toxicity.

**Star Allele → Phenotype:**
| Diplotype Examples | Phenotype |
|---|---|
| *1/*1 | NM |
| *1/*2A, *1/*13, HapB3/normal | IM |
| *2A/*2A, *13/*13, *2A/*13 | PM |

**Phenotype → Risk:**
| Phenotype | Risk Label | Severity | Reason |
|---|---|---|---|
| PM | Toxic | Critical | Drug can't be cleared — severe/fatal toxicity |
| IM | Adjust Dosage | High | Reduce starting dose by 25-50% |
| NM | Safe | None | Normal clearance |

---

## 4. Complete Data Flow

```
BROWSER
-------
1. User uploads .vcf file
2. FileReader API reads file as text (no server upload — avoids Vercel 4.5MB limit)
3. JS parser extracts all variants: [{ gene, star, rsid }]
4. User enters drug(s): "CODEINE, WARFARIN"
5. User enters patient ID: "PATIENT_001"
6. POST to /api/analyze with: { variants, drugs, patientId }

SERVER (Next.js API Route)
--------------------------
7. For each drug:
   a. Find relevant gene from drug→gene map
   b. Filter variants for that gene
   c. Collect star alleles → determine diplotype
   d. Look up diplotype → phenotype (CPIC table)
   e. Look up phenotype + drug → risk label + severity
   f. Calculate confidence score
   g. Call Gemini: explain the mechanism in clinical language

8. Return array of results matching exact JSON schema

BROWSER
-------
9. Display results dashboard:
   - Risk badge per drug (color coded)
   - Gemini explanation (expandable)
   - Full genomic profile
10. JSON download button
```

---

## 5. File Structure

```
app/
  page.tsx                    → main UI layout
  api/
    analyze/
      route.ts                → orchestrates everything, returns JSON

lib/
  vcf-parser.ts               → parse VCF text → extract variants
  cpic.ts                     → all lookup tables + phenotype logic
  types.ts                    → TypeScript types matching exact JSON schema
  ai.ts                       → Gemini key rotation (already done)
  utils.ts                    → cn() helper (from shadcn, already done)

components/
  vcf-upload.tsx              → drag & drop file input
  drug-input.tsx              → drug selection (text + validation)
  results-dashboard.tsx       → full results view
  risk-badge.tsx              → colored Safe/Toxic/Adjust/Ineffective badge
  gene-profile-card.tsx       → diplotype + phenotype card per gene
  json-download.tsx           → download + copy to clipboard button
```

---

## 6. The Exact JSON Schema We Must Match

```typescript
{
  patient_id: string                    // from user input
  drug: string                          // uppercase drug name
  timestamp: string                     // ISO8601
  risk_assessment: {
    risk_label: "Safe" | "Adjust Dosage" | "Toxic" | "Ineffective" | "Unknown"
    confidence_score: number            // 0.0 to 1.0
    severity: "none" | "low" | "moderate" | "high" | "critical"
  }
  pharmacogenomic_profile: {
    primary_gene: string                // e.g. "CYP2D6"
    diplotype: string                   // e.g. "*4/*4"
    phenotype: "PM" | "IM" | "NM" | "RM" | "URM" | "Unknown"
    detected_variants: Array<{
      rsid: string
      gene: string
      star_allele: string
    }>
  }
  clinical_recommendation: {
    summary: string
    action: string
    alternative_drugs?: string[]
  }
  llm_generated_explanation: {
    summary: string
    mechanism: string
    recommendation: string
  }
  quality_metrics: {
    vcf_parsing_success: boolean
    variants_detected: number
    genes_analyzed: string[]
  }
}
```

---

## 7. Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| VCF parsing location | Browser (FileReader) | Avoids Vercel 4.5MB body limit |
| Risk logic | Hardcoded CPIC tables | Deterministic = matches test cases |
| AI role | Explanation only, not prediction | Accurate output, Gemini can't hallucinate the risk |
| Multiple drugs | Run pipeline once per drug, return array | Clean, parallelizable |
| Gemini calls | Promise.all (parallel) | Speed — all drugs analyzed simultaneously |
| State management | React useState | No Zustand/Redux needed for this scope |
| Deployment | Vercel | Best for Next.js, deploy at hour 8 not the end |

---

## 8. Confidence Score Logic

```
Both alleles clearly identified in VCF  → 0.95
Only one allele identified              → 0.70
No alleles found for this gene          → 0.30 (return Unknown)
```

---

## 9. Drug → Gene Mapping

```typescript
const DRUG_GENE_MAP = {
  CODEINE:       "CYP2D6",
  WARFARIN:      "CYP2C9",
  CLOPIDOGREL:   "CYP2C19",
  SIMVASTATIN:   "SLCO1B1",
  AZATHIOPRINE:  "TPMT",
  FLUOROURACIL:  "DPYD",
}
```

---

## 10. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| VCF file > 4.5MB hits Vercel limit | HIGH | Parse in browser, send only JSON to API |
| Star allele combination not in our tables | MEDIUM | Return "Unknown" phenotype gracefully |
| Gemini slow on multiple drugs | MEDIUM | Promise.all for parallel calls + 4-key rotation |
| Exact test case mismatch | MEDIUM | Sort diplotype alleles consistently (*1/*4 not *4/*1) |
| Deployment fails at the end | HIGH | Deploy to Vercel at hour 8, not hour 10 |
| LinkedIn video forgotten | DEADLY | Assign to a non-coder teammate immediately |

---

## 11. Differentiators Over Other Teams

1. **All 6 drugs analyzed simultaneously** from one upload — most teams do one at a time
2. **Alternative drug suggestions** from Gemini — "If Codeine is toxic, consider Tramadol because..."
3. **shadcn UI** — will look 10x more professional than Python Flask submissions
4. **Confidence scoring** — shows how certain the prediction is and why
5. **Gemini explains the biological mechanism** — not just "Toxic" but why at the molecular level

---

## 12. Gemini Prompt Template

```
You are a clinical pharmacogenomics expert assistant.

Patient Data:
- Gene: {gene}
- Diplotype: {diplotype}
- Phenotype: {phenotype}
- Detected Variant: {rsid}
- Drug: {drug}
- Risk Assessment: {risk_label} (Severity: {severity})

Provide a clinical explanation in this exact JSON format:
{
  "summary": "One sentence summary of the risk for a non-specialist",
  "mechanism": "2-3 sentences explaining the biological mechanism using the specific variant",
  "recommendation": "Specific actionable clinical recommendation aligned with CPIC guidelines"
}

Be precise, cite the rsID and diplotype. Do not add any text outside the JSON.
```

---

## 13. Build Order (10 Hour Budget)

| Time | Task | File |
|---|---|---|
| Hour 0 – 0.5 | types.ts — TypeScript interfaces matching JSON schema | lib/types.ts |
| Hour 0.5 – 1.5 | vcf-parser.ts — parse VCF text, extract GENE/STAR/RS | lib/vcf-parser.ts |
| Hour 1.5 – 3 | cpic.ts — all lookup tables, diplotype→phenotype, phenotype+drug→risk | lib/cpic.ts |
| Hour 3 – 4 | /api/analyze route — wire parser + cpic + gemini + return JSON | app/api/analyze/route.ts |
| Hour 4 – 5 | VCF upload + drug input UI (functional, not pretty yet) | components/ |
| Hour 5 – 7 | Results dashboard — risk badges, gene profile, Gemini explanation | components/ |
| Hour 7 – 7.5 | JSON download + copy to clipboard | components/ |
| Hour 7.5 – 8 | Error states + loading skeletons | throughout |
| Hour 8 – 8.5 | Deploy to Vercel — get live URL | — |
| Hour 8.5 – 9.5 | Test against sample VCFs — fix any mismatches | — |
| Hour 9.5 – 10 | README + .env.example | — |
