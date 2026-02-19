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
}

// ─── Batch Prompt Builder ─────────────────────────────────────────────────────
// One prompt → one API call → array of explanations.
// Reduces quota usage from N calls to 1 regardless of how many drugs are selected.

function buildBatchPrompt(inputs: ExplainInput[]): string {
  const entries = inputs
    .map(
      (inp, i) =>
        `[${i + 1}] ${inp.drug} | Gene: ${inp.gene} | Diplotype: ${inp.diplotype} | Phenotype: ${inp.phenotype} | Variant: ${inp.rsid} | Risk: ${inp.risk_label} (${inp.severity})`
    )
    .join("\n");

  // Render exactly N placeholder rows — prevents model from returning fewer objects
  const skeleton = inputs
    .map(() => `  {"summary":"...","mechanism":"...","recommendation":"...","citations":"..."}`)
    .join(",\n");

  return `You are a clinical pharmacogenomics expert. For each numbered drug below write one JSON object. Return ONLY a JSON array of exactly ${inputs.length} objects, same order, no extra text.

${entries}

Fields per object:
- summary: one sentence risk summary for a non-specialist
- mechanism: 2-3 sentences on biological mechanism citing the rsID and diplotype
- recommendation: specific CPIC-aligned clinical action
- citations: one sentence referencing the specific rsID, star allele, diplotype, and CPIC guideline (e.g. "CPIC Guideline for CYP2D6 and Codeine (2022); variant rs3892097 (*4 allele); diplotype *1/*4")

Return exactly this structure (${inputs.length} objects):
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
  citations:      "See CPIC guidelines at cpicpgx.org for variant-specific guidance.",
};

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

    return parsed.map((item) => ({
      summary:        item?.summary        || FALLBACK_EXPLANATION.summary,
      mechanism:      item?.mechanism      || FALLBACK_EXPLANATION.mechanism,
      recommendation: item?.recommendation || FALLBACK_EXPLANATION.recommendation,
      citations:      item?.citations      || FALLBACK_EXPLANATION.citations,
    }));
  } catch (err) {
    console.error("[PharmaGuard] Gemini batch call failed:", err);
    return inputs.map(() => FALLBACK_EXPLANATION);
  }
}
