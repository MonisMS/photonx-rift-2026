import { NextResponse } from "next/server";
import { explainSingle } from "@/lib/gemini";
import type { AnalysisResult } from "@/lib/types";
import type { CPICResult } from "@/app/api/analyze/route";

export const runtime = "nodejs";

// ─── Route Handler ────────────────────────────────────────────────────────────
// Takes ONE Phase 1 result, returns it with AI explanation attached.
// Called in parallel from the client — one request per drug.

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body?.result || !body.result.drug) {
    return NextResponse.json(
      { error: "Invalid request. Expected { result: CPICResult }." },
      { status: 400 },
    );
  }

  const cpicResult: CPICResult = body.result;

  const explanation = await explainSingle({
    gene:       cpicResult.pharmacogenomic_profile.primary_gene,
    diplotype:  cpicResult.pharmacogenomic_profile.diplotype,
    phenotype:  cpicResult.pharmacogenomic_profile.phenotype,
    rsid:       cpicResult.pharmacogenomic_profile.detected_variants[0]?.rsid ?? "unknown",
    drug:       cpicResult.drug,
    risk_label: cpicResult.risk_assessment.risk_label,
    severity:   cpicResult.risk_assessment.severity,
  });

  const fullResult: AnalysisResult = {
    ...cpicResult,
    llm_generated_explanation: explanation,
  };

  return NextResponse.json({ result: fullResult });
}
