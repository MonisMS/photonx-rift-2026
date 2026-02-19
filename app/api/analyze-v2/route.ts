/**
 * CPIC Analysis API (v2) - With Live CPIC API Integration
 * 
 * POST /api/analyze-v2
 * POST /api/analyze-v2?mode=fast   → Use hardcoded data only (instant)
 * POST /api/analyze-v2?mode=api    → Fetch live CPIC API data (slower but richer)
 * 
 * Default mode: "fast" (for optimal UX)
 * 
 * Same input/output as /api/analyze, but uses live CPIC API data when available.
 * Falls back to hardcoded data on API failure.
 * 
 * Additional response fields:
 * - dataSources: shows which data came from API vs hardcoded
 * - cpicLevel: CPIC evidence level (A, B, C, D)
 * - citations: PMID references from CPIC API
 */

import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/validator";
import { 
  CPIC_REFERENCES, 
  analyzeMultipleDrugsWithAPI,
  analyzeMultipleDrugsFast,
} from "@/lib/cpic";
import type { SupportedDrug } from "@/lib/types";
import type { CPICResult } from "@/app/api/analyze/route";

export const runtime = "nodejs";

// Extended result type with API metadata
export interface CPICResultV2 extends CPICResult {
  data_sources: {
    gene: "api" | "hardcoded";
    phenotype: "api" | "hardcoded";
    risk: "api" | "hardcoded";
  };
  cpic_level: string | null;
  api_citations: string[] | null;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "fast"; // Default to fast mode
  
  const body = await req.json().catch(() => null);
  const validation = validateRequest(body);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { variants, drugs, patientId, genesDetected } = validation;
  const timestamp = new Date().toISOString();
  const genesDetectedSet = new Set(genesDetected);
  const genesAnalyzed = [...new Set([...genesDetected, ...variants.map((v) => v.gene)])];

  // Perform analysis based on mode
  const analysisResults = mode === "api"
    ? await analyzeMultipleDrugsWithAPI(drugs as SupportedDrug[], variants, false)
    : analyzeMultipleDrugsFast(drugs as SupportedDrug[], variants, false);

  const results: CPICResultV2[] = analysisResults.map((result) => {
    const geneWasSequenced = genesDetectedSet.has(result.gene);
    const geneVariants = variants.filter((v) => v.gene === result.gene);
    
    // Recalculate confidence with geneDetected info
    const confidence = result.confidence;
    const adjustedConfidence = geneWasSequenced && result.diplotype === "*1/*1" 
      ? 0.90 
      : confidence;

    return {
      patient_id: patientId,
      drug: result.drug,
      timestamp,
      risk_assessment: {
        risk_label:       result.risk.risk_label,
        confidence_score: adjustedConfidence,
        severity:         result.risk.severity,
      },
      pharmacogenomic_profile: {
        primary_gene: result.gene,
        diplotype: result.diplotype ?? (geneWasSequenced ? "*1/*1" : "*1/*1"),
        phenotype: result.phenotype,
        detected_variants: geneVariants.map((v) => ({
          rsid:        v.rsid,
          gene:        v.gene,
          star_allele: v.starAllele,
        })),
      },
      clinical_recommendation: {
        summary:             result.risk.action,
        action:              result.risk.action,
        alternative_drugs:   result.risk.alternatives,
        guideline_reference: result.citations 
          ? `CPIC Guideline — PMIDs: ${result.citations.join(", ")}`
          : CPIC_REFERENCES[result.drug],
      },
      quality_metrics: {
        vcf_parsing_success: true,
        variants_detected:   variants.length,
        genes_analyzed:      genesAnalyzed,
      },
      // V2 additions
      data_sources: result.dataSources,
      cpic_level: result.cpicLevel,
      api_citations: result.citations,
    };
  });

  // Calculate how much data came from API vs hardcoded
  const apiUsage = {
    gene: results.filter(r => r.data_sources.gene === "api").length,
    phenotype: results.filter(r => r.data_sources.phenotype === "api").length,
    risk: results.filter(r => r.data_sources.risk === "api").length,
    total: results.length,
  };

  return NextResponse.json({ 
    results,
    mode,
    api_usage: apiUsage,
  });
}
