import { NextResponse } from "next/server";
import { validateRequest, HARDCODED_DRUGS } from "@/lib/validator";
import { DRUG_GENE_MAP, CPIC_REFERENCES, buildDiplotype, getPhenotype, getRisk, getConfidence } from "@/lib/cpic";
import { getGeneByDrugName, getRiskForAnyDrug } from "@/lib/cpic-api";
import type { AnalysisResult, SupportedDrug, SupportedGene, Phenotype } from "@/lib/types";

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

  const { variants, drugs, patientId, genesDetected } = validation;
  const timestamp = new Date().toISOString();
  const genesDetectedSet = new Set(genesDetected);
  const genesAnalyzed = [...new Set([...genesDetected, ...variants.map((v) => v.gene)])];

  // Process drugs - some hardcoded, some via API
  const results: CPICResult[] = await Promise.all(
    drugs.map(async (drug: string) => {
      const isHardcoded = HARDCODED_DRUGS.has(drug);
      
      let gene: SupportedGene | string;
      let diplotype: string;
      let phenotype: Phenotype;
      let risk: { risk_label: string; severity: string; action: string; alternatives?: string[] };
      let confidence: number;
      let guidelineReference: string;
      
      if (isHardcoded) {
        // Use deterministic hardcoded tables (fast, accurate)
        const hardcodedGene = DRUG_GENE_MAP[drug as SupportedDrug];
        gene = hardcodedGene;
        const geneWasSequenced = genesDetectedSet.has(hardcodedGene);
        diplotype = buildDiplotype(variants, hardcodedGene) ?? (geneWasSequenced ? "*1/*1" : "*1/*1");
        phenotype = getPhenotype(hardcodedGene, diplotype);
        risk = getRisk(drug as SupportedDrug, phenotype);
        confidence = getConfidence(variants, hardcodedGene, geneWasSequenced);
        guidelineReference = CPIC_REFERENCES[drug as SupportedDrug];
      } else {
        // Dynamic drug - lookup gene and recommendation from CPIC API
        const apiGene = await getGeneByDrugName(drug);
        gene = apiGene || "Unknown";
        
        if (apiGene && genesDetectedSet.has(apiGene as SupportedGene)) {
          // We have genetic data for this gene - use it!
          diplotype = buildDiplotype(variants, apiGene as SupportedGene) ?? "*1/*1";
          phenotype = getPhenotype(apiGene as SupportedGene, diplotype);
          confidence = getConfidence(variants, apiGene as SupportedGene, true) * 0.85;
          
          // Query CPIC API for actual recommendation
          const apiRisk = await getRiskForAnyDrug(drug, phenotype, apiGene);
          if (apiRisk) {
            risk = {
              risk_label: apiRisk.risk_label,
              severity: apiRisk.severity,
              action: apiRisk.action,
              alternatives: apiRisk.alternatives,
            };
          } else {
            // Fallback: derive from phenotype
            risk = deriveRiskFromPhenotype(phenotype, drug, apiGene);
          }
        } else if (apiGene) {
          // Gene known but not sequenced - assume normal metabolizer
          diplotype = "*1/*1";
          phenotype = "NM";
          confidence = 0.50;
          
          // Try to get NM recommendation from API
          const apiRisk = await getRiskForAnyDrug(drug, "NM", apiGene);
          if (apiRisk) {
            risk = {
              risk_label: apiRisk.risk_label,
              severity: apiRisk.severity,
              action: apiRisk.action,
              alternatives: apiRisk.alternatives,
            };
          } else {
            risk = {
              risk_label: "Safe",
              severity: "none",
              action: `Normal metabolizer expected. Use ${drug} at standard dose.`,
              alternatives: [],
            };
          }
        } else {
          // Gene unknown
          diplotype = "*1/*1";
          phenotype = "Unknown";
          confidence = 0.30;
          risk = {
            risk_label: "Unknown",
            severity: "none",
            action: `No pharmacogenomic data available for ${drug}.`,
            alternatives: [],
          };
        }
        
        guidelineReference = `https://cpicpgx.org/guidelines/${drug.toLowerCase()}/`;
      }

      const geneVariants = gene !== "Unknown" 
        ? variants.filter((v) => v.gene === gene) 
        : [];

      return {
        patient_id: patientId,
        drug,
        timestamp,
        risk_assessment: {
          risk_label: risk.risk_label as any,
          confidence_score: confidence,
          severity: risk.severity as any,
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
          summary: risk.action,
          action: risk.action,
          alternative_drugs: risk.alternatives || [],
          guideline_reference: guidelineReference,
        },
        quality_metrics: {
          vcf_parsing_success: true,
          variants_detected: variants.length,
          genes_analyzed: genesAnalyzed,
        },
      };
    })
  );

  return NextResponse.json({ results });
}

// ─── Helper: Derive risk from phenotype when API doesn't return data ──────────

function deriveRiskFromPhenotype(
  phenotype: Phenotype,
  drug: string,
  gene: string
): { risk_label: string; severity: string; action: string; alternatives?: string[] } {
  switch (phenotype) {
    case "PM":
      return {
        risk_label: "Adjust Dosage",
        severity: "high",
        action: `Poor metabolizer detected for ${gene}. Consider dose reduction or alternative for ${drug}.`,
        alternatives: [],
      };
    case "IM":
      return {
        risk_label: "Adjust Dosage",
        severity: "moderate",
        action: `Intermediate metabolizer for ${gene}. Monitor ${drug} response and consider dose adjustment.`,
        alternatives: [],
      };
    case "NM":
      return {
        risk_label: "Safe",
        severity: "none",
        action: `Normal metabolizer for ${gene}. Use ${drug} at standard dose.`,
        alternatives: [],
      };
    case "RM":
    case "URM":
      return {
        risk_label: "Adjust Dosage",
        severity: "moderate",
        action: `Rapid/ultrarapid metabolizer for ${gene}. ${drug} may be less effective or require higher dose.`,
        alternatives: [],
      };
    default:
      return {
        risk_label: "Unknown",
        severity: "none",
        action: `Review CPIC guidelines for ${drug}. Gene ${gene} may affect metabolism.`,
        alternatives: [],
      };
  }
}
