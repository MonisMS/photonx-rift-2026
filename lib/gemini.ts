import { generateText } from "ai";
import { getModel } from "@/lib/ai";
import type { LLMExplanation, Phenotype, RiskLabel, Severity } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExplainInput {
  gene:       string;
  diplotype:  string;
  phenotype:  Phenotype;
  rsid:       string;
  drug:       string;
  risk_label: RiskLabel;
  severity:   Severity;
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildPrompt(input: ExplainInput): string {
  return `You are a clinical pharmacogenomics expert assistant.

Patient Data:
- Gene: ${input.gene}
- Diplotype: ${input.diplotype}
- Phenotype: ${input.phenotype}
- Detected Variant: ${input.rsid}
- Drug: ${input.drug}
- Risk Assessment: ${input.risk_label} (Severity: ${input.severity})

Respond ONLY with valid JSON in this exact format, no extra text:
{
  "summary": "One sentence summary of the risk for a non-specialist",
  "mechanism": "2-3 sentences explaining the biological mechanism, citing the rsID and diplotype",
  "recommendation": "Specific actionable clinical recommendation aligned with CPIC guidelines"
}`;
}

// ─── JSON Extractor ───────────────────────────────────────────────────────────
// Gemini sometimes wraps JSON in markdown code blocks — strip that

function extractJSON(raw: string): string {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : raw.trim();
}

// ─── Single Drug Explainer ────────────────────────────────────────────────────

const FALLBACK_EXPLANATION: LLMExplanation = {
  summary:        "Clinical explanation unavailable.",
  mechanism:      "Could not generate mechanism at this time.",
  recommendation: "Consult a clinical pharmacist for detailed guidance.",
};

async function explainDrug(input: ExplainInput): Promise<LLMExplanation> {
  try {
    const { text } = await generateText({
      model:  getModel("flash"),
      prompt: buildPrompt(input),
    });

    const parsed = JSON.parse(extractJSON(text)) as LLMExplanation;

    return {
      summary:        parsed.summary        || FALLBACK_EXPLANATION.summary,
      mechanism:      parsed.mechanism      || FALLBACK_EXPLANATION.mechanism,
      recommendation: parsed.recommendation || FALLBACK_EXPLANATION.recommendation,
    };
  } catch (err) {
    // Log the real error so it shows in Vercel function logs
    console.error(`[PharmaGuard] Gemini call failed for ${input.drug}:`, err);
    return FALLBACK_EXPLANATION;
  }
}

// ─── Parallel Explainer (all drugs at once) ───────────────────────────────────

export async function explainAll(inputs: ExplainInput[]): Promise<LLMExplanation[]> {
  return Promise.all(inputs.map(explainDrug));
}
