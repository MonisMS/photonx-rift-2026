import { NextResponse } from "next/server";
import { validateRequest, CORE_DRUGS } from "@/lib/validator";
import { DRUG_GENE_MAP, CPIC_REFERENCES, buildDiplotype, getPhenotype, getRisk, getConfidenceDetailed, type ConfidenceReason } from "@/lib/cpic";
import type { AnalysisResult, SupportedDrug, SupportedGene, Phenotype, DecisionTrace } from "@/lib/types";

export const runtime = "nodejs";

// ─── Types ──────────────────────────────────────────────────────────────────────

// Phase 1 result — no LLM explanation yet
export type CPICResult = Omit<AnalysisResult, "llm_generated_explanation">;

// ─── Confidence Reason Labels ──────────────────────────────────────────────────

const CONFIDENCE_LABELS: Record<ConfidenceReason, string> = {
  full_diplotype_resolved: "Both alleles explicitly identified in VCF",
  single_allele_inferred: "One allele identified; second inferred as wildtype (*1)",
  reference_genotype: "Gene sequenced, no variants → reference genotype (*1/*1)",
  gene_not_sequenced: "Gene not present in VCF panel",
};

// ─── CPIC Guideline Year References (Core 6 only) ─────────────────────────────

const GUIDELINE_YEARS: Record<string, string> = {
  CODEINE: "2019",
  WARFARIN: "2017",
  CLOPIDOGREL: "2022",
  SIMVASTATIN: "2022",
  AZATHIOPRINE: "2018",
  FLUOROURACIL: "2017",
};

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const validation = validateRequest(body);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { variants, drugs, patientId, genesDetected } = validation;
  const timestamp = new Date().toISOString();
  const genesDetectedSet = new Set(genesDetected);
  const genesAnalyzed = [...new Set([...genesDetected, ...variants.map((v) => v.gene)])];

  // Process only CORE_DRUGS (validator already filters to these 6)
  const results: CPICResult[] = drugs.map((drug: string) => {
    // All drugs here are guaranteed to be in CORE_DRUGS by validator
    const gene = DRUG_GENE_MAP[drug as SupportedDrug];
    const geneWasSequenced = genesDetectedSet.has(gene);
    const diplotype = buildDiplotype(variants, gene) ?? "*1/*1";
    const phenotype = getPhenotype(gene, diplotype);
    const risk = getRisk(drug as SupportedDrug, phenotype);
    const confidenceResult = getConfidenceDetailed(variants, gene, geneWasSequenced);
    const guidelineReference = CPIC_REFERENCES[drug as SupportedDrug];
    
    const geneVariants = variants.filter((v) => v.gene === gene);
    
    // Build phenotype rule description
    const phenotypeRuleMap: Record<Phenotype, string> = {
      PM: "Poor Metabolizer → reduced/altered dosing",
      IM: "Intermediate Metabolizer → consider dose adjustment",
      NM: "Normal Metabolizer → standard dosing",
      RM: "Rapid Metabolizer → monitor for reduced efficacy",
      URM: "Ultrarapid Metabolizer → significant dose or drug change",
      Unknown: "Unknown phenotype → insufficient data",
    };
    
    // Build decision trace
    const decisionTrace: DecisionTrace = {
      lookup_source: `CPIC ${GUIDELINE_YEARS[drug]} ${gene}-${drug} Table`,
      phenotype_rule: phenotypeRuleMap[phenotype],
      evidence_level: "A",
      classification_type: "deterministic_table_lookup",
      confidence_reason: CONFIDENCE_LABELS[confidenceResult.reason],
    };
    
    // Add VKORC1 note for warfarin
    if (drug === "WARFARIN") {
      decisionTrace.notes = "CPIC warfarin dosing also incorporates VKORC1 genotype and clinical factors (age, weight, interacting drugs). This analysis evaluates CYP2C9 only.";
    }

    return {
      patient_id: patientId,
      drug,
      timestamp,
      risk_assessment: {
        risk_label: risk.risk_label,
        confidence_score: confidenceResult.score,
        severity: risk.severity,
      },
      pharmacogenomic_profile: {
        primary_gene: gene,
        diplotype,
        phenotype,
        detected_variants: geneVariants.map((v) => ({
          rsid: v.rsid,
          gene: v.gene,
          star_allele: v.starAllele,
        })),
      },
      clinical_recommendation: {
        summary: decisionTrace.notes ? `${risk.action} ${decisionTrace.notes}` : risk.action,
        action: risk.action,
        alternative_drugs: risk.alternatives || [],
        guideline_reference: guidelineReference,
      },
      quality_metrics: {
        vcf_parsing_success: true,
        variants_detected: geneVariants.length,
        genes_analyzed: genesAnalyzed,
        decision_trace: decisionTrace,  // Nested inside quality_metrics for schema compliance
      },
    };
  });

  return NextResponse.json({ results });
}
