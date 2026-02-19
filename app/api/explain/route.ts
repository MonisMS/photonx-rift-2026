import { NextResponse } from "next/server";
import { explainAll } from "@/lib/gemini";
import type { AnalysisResult } from "@/lib/types";
import type { CPICResult } from "@/app/api/analyze/route";

export const runtime = "nodejs";

// ─── Route Handler ────────────────────────────────────────────────────────────
// Takes Phase 1 results from /api/analyze, adds Gemini explanations

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body?.results || !Array.isArray(body.results)) {
    return NextResponse.json({ error: "Invalid request. Expected { results: CPICResult[] }." }, { status: 400 });
  }

  const cpicResults: CPICResult[] = body.results;

  // Build Gemini inputs from CPIC results
  const explainInputs = cpicResults.map((r) => ({
    gene:       r.pharmacogenomic_profile.primary_gene,
    diplotype:  r.pharmacogenomic_profile.diplotype,
    phenotype:  r.pharmacogenomic_profile.phenotype,
    rsid:       r.pharmacogenomic_profile.detected_variants[0]?.rsid ?? "unknown",
    drug:       r.drug,
    risk_label: r.risk_assessment.risk_label,
    severity:   r.risk_assessment.severity,
  }));

  // Single batched call — all drugs in one prompt, one API request total
  const explanations = await explainAll(explainInputs);

  // Merge explanations into full results
  const fullResults: AnalysisResult[] = cpicResults.map((r, i) => ({
    ...r,
    llm_generated_explanation: explanations[i],
  }));

  return NextResponse.json({ results: fullResults });
}
