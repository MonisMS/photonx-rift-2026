import { generateWithFallback } from "@/lib/ai";
import type { LLMExplanation, Phenotype, RiskLabel, Severity } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExplainInput {
  gene:       string;
  diplotype:  string;
  phenotype:  Phenotype;
  rsid:       string;
  drug:       string;
  risk_label: RiskLabel;
  severity:   Severity;
  guideline_reference: string;
}

// ─── Batch Prompt Builder ─────────────────────────────────────────────────────
// One prompt → one API call → array of explanations.
// Reduces quota usage from N calls to 1 regardless of how many drugs are selected.

function buildBatchPrompt(inputs: ExplainInput[]): string {
  const entries = inputs
    .map(
      (inp, i) =>
        `[${i + 1}] drug=${inp.drug}, primary_gene=${inp.gene}, diplotype=${inp.diplotype}, phenotype=${inp.phenotype}, rsid=${inp.rsid}, guideline_reference=${inp.guideline_reference}`,
    )
    .join("\n");

  // Render exactly N placeholder rows — prevents model from returning fewer objects
  const skeleton = inputs
    .map(() => `  {"summary":"...","mechanism":"...","recommendation":"...","citations":"..."}`)
    .join(",\n");

  return `You are generating clinical explanations for pharmacogenomic results.

For each numbered line below, create ONE JSON object.

INPUT LINES:
${entries}

RULES (must follow for every object):
1. You may ONLY reference: primary_gene, diplotype, phenotype, detected_variants (rsid, star_allele), guideline_reference.
2. If rsid is "NONE", treat detected_variants as empty: do not mention any rsIDs or SNP identifiers and state that no actionable variants were detected.
3. If rsid is not "NONE", you may reference ONLY that rsID and must NOT invent new identifiers.
4. Do NOT invent CPIC guideline versions or links; use guideline_reference as given.
5. Do NOT introduce genes not present in the input.
6. If there is no variant-level data (rsid = "NONE"), describe the mechanism at the phenotype level only.
7. The citations field must contain ONLY guideline_reference and, if rsid != "NONE", that rsID.

Return ONLY a JSON array with exactly ${inputs.length} objects in this order:
[
${skeleton}
]`;
}

// ─── JSON Extractor ───────────────────────────────────────────────────────────

function extractJSON(raw: string): string {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : raw.trim();
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

const FALLBACK_EXPLANATION: LLMExplanation = {
  summary:        "Clinical explanation unavailable.",
  mechanism:      "Could not generate mechanism at this time.",
  recommendation: "Consult a clinical pharmacist for detailed guidance.",
  citations:      "", // Overridden per-result based on guideline_reference + rsIDs
};

// Build citations string strictly from guideline_reference and optional rsID
function buildCitations(input: ExplainInput): string {
  const hasVariant = input.rsid && input.rsid !== "NONE";
  return hasVariant
    ? `${input.guideline_reference}; ${input.rsid}`
    : input.guideline_reference;
}

// ─── Batch Explainer — 1 API call for all drugs ───────────────────────────────

export async function explainAll(inputs: ExplainInput[]): Promise<LLMExplanation[]> {
  if (inputs.length === 0) return [];

  try {
    const text = await generateWithFallback(buildBatchPrompt(inputs));
    if (!text) return inputs.map(() => FALLBACK_EXPLANATION);

    const parsed = JSON.parse(extractJSON(text)) as LLMExplanation[];

    // Validate we got back an array of the right length
    if (!Array.isArray(parsed) || parsed.length !== inputs.length) {
      throw new Error(`Expected array of ${inputs.length}, got ${Array.isArray(parsed) ? parsed.length : typeof parsed}`);
    }

    return parsed.map((item, idx) => ({
      summary:        item?.summary        || FALLBACK_EXPLANATION.summary,
      mechanism:      item?.mechanism      || FALLBACK_EXPLANATION.mechanism,
      recommendation: item?.recommendation || FALLBACK_EXPLANATION.recommendation,
      // Citations are deterministic: guideline_reference [+ rsID]
      citations:      buildCitations(inputs[idx]),
    }));
  } catch (err) {
    console.error("[PharmaGuard] Gemini batch call failed:", err);
    return inputs.map((inp) => ({
      ...FALLBACK_EXPLANATION,
      citations: buildCitations(inp),
    }));
  }
}

// ─── Single Drug Explainer — 1 API call for 1 drug (used for parallel) ───────

function buildSinglePrompt(input: ExplainInput): string {
  const rsidInfo = input.rsid && input.rsid !== "NONE" ? input.rsid : "NONE";

  return `You are generating a clinical pharmacogenomic explanation for a single drug.

Context:
- drug: ${input.drug}
- primary_gene: ${input.gene}
- diplotype: ${input.diplotype}
- phenotype: ${input.phenotype}
- detected_variants_rsids: ${rsidInfo}
- guideline_reference: ${input.guideline_reference}

Rules (must follow all):
1. You may ONLY reference: primary_gene, diplotype, phenotype, detected_variants (rsid, star_allele), guideline_reference.
2. If detected_variants_rsids is "NONE", do NOT invent or mention any rsIDs or SNP identifiers. Clearly state that no actionable variants were detected.
3. If detected_variants_rsids is not "NONE", you may reference ONLY that rsID and must NOT invent new identifiers.
4. Do NOT invent CPIC guideline versions or links. Use guideline_reference exactly as given.
5. Do NOT introduce genes that are not present in the input.
6. If no variant-level data is provided (detected_variants_rsids = "NONE"), describe the mechanism at the phenotype level only.
7. The citations field must contain ONLY guideline_reference and, if present, the allowed rsID.

Return STRICT JSON only (no markdown, no extra text):
{"summary":"...","mechanism":"...","recommendation":"...","citations":"..."}`;
}

export async function explainSingle(input: ExplainInput): Promise<LLMExplanation> {
  try {
    const text = await generateWithFallback(buildSinglePrompt(input));
    if (!text) return FALLBACK_EXPLANATION;

    const parsed = JSON.parse(extractJSON(text)) as LLMExplanation;

    return {
      summary:        parsed?.summary        || FALLBACK_EXPLANATION.summary,
      mechanism:      parsed?.mechanism      || FALLBACK_EXPLANATION.mechanism,
      recommendation: parsed?.recommendation || FALLBACK_EXPLANATION.recommendation,
      // Citations are deterministic: guideline_reference [+ rsID]
      citations:      buildCitations(input),
    };
  } catch (err) {
    console.error(`[PharmaGuard] Single explain failed for ${input.drug}:`, err);
    return {
      ...FALLBACK_EXPLANATION,
      citations: buildCitations(input),
    };
  }
}
