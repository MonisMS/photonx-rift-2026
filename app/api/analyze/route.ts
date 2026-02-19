import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/validator";
import { DRUG_GENE_MAP, buildDiplotype, getPhenotype, getRisk, getConfidence } from "@/lib/cpic";
import type { AnalysisResult, SupportedDrug } from "@/lib/types";

export const runtime = "nodejs";

// ─── Types ────────────────────────────────────────────────────────────────────

// Phase 1 result — no LLM explanation yet
export type CPICResult = Omit<AnalysisResult, "llm_generated_explanation">;

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const validation = validateRequest(body);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { variants, drugs, patientId } = validation;
  const timestamp = new Date().toISOString();
  const genesAnalyzed = [...new Set(variants.map((v) => v.gene))];

  const results: CPICResult[] = drugs.map((drug: SupportedDrug) => {
    const gene       = DRUG_GENE_MAP[drug];
    const diplotype  = buildDiplotype(variants, gene) ?? "*1/*1";
    const phenotype  = getPhenotype(gene, diplotype);
    const risk       = getRisk(drug, phenotype);
    const confidence = getConfidence(variants, gene);

    const geneVariants = variants.filter((v) => v.gene === gene);

    return {
      patient_id: patientId,
      drug,
      timestamp,
      risk_assessment: {
        risk_label:       risk.risk_label,
        confidence_score: confidence,
        severity:         risk.severity,
      },
      pharmacogenomic_profile: {
        primary_gene: gene,
        diplotype,
        phenotype,
        detected_variants: geneVariants.map((v) => ({
          rsid:        v.rsid,
          gene:        v.gene,
          star_allele: v.starAllele,
        })),
      },
      clinical_recommendation: {
        summary:           risk.action,
        action:            risk.action,
        alternative_drugs: risk.alternatives,
      },
      quality_metrics: {
        vcf_parsing_success: true,
        variants_detected:   variants.length,
        genes_analyzed:      genesAnalyzed,
      },
    };
  });

  return NextResponse.json({ results });
}
