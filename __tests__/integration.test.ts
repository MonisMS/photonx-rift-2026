import { describe, it, expect } from "vitest";
import { parseVCF } from "@/lib/vcf-parser";
import { validateRequest } from "@/lib/validator";
import {
  buildDiplotype,
  getPhenotype,
  getRisk,
  getConfidence,
  DRUG_GENE_MAP,
  CPIC_REFERENCES,
} from "@/lib/cpic";
import type { SupportedDrug, SupportedGene, AnalysisResult } from "@/lib/types";

// ─── Helper: simulate the full /api/analyze pipeline ──────────────────────────

function simulateAnalyzePipeline(
  vcfText: string,
  drugList: SupportedDrug[],
  overridePatientId?: string,
): { results: Omit<AnalysisResult, "llm_generated_explanation">[]; error?: string } {
  const parsed = parseVCF(vcfText);
  if (!parsed.success) return { results: [], error: parsed.error };

  const patientId = overridePatientId ?? parsed.patientId;
  const validation = validateRequest({
    patientId,
    variants: parsed.variants,
    drugs: drugList,
    genesDetected: parsed.genesDetected,
  });

  if (!validation.valid) return { results: [], error: validation.error };

  const { variants, drugs, genesDetected } = validation;
  const timestamp = "2026-02-20T12:00:00.000Z";
  const genesDetectedSet = new Set(genesDetected);
  const genesAnalyzed = [...new Set([...genesDetected, ...variants.map((v) => v.gene)])];

  const results = drugs.map((drug: string) => {
    const gene = DRUG_GENE_MAP[drug as SupportedDrug];
    const geneWasSequenced = genesDetectedSet.has(gene);
    const diplotype = buildDiplotype(variants, gene) ?? "*1/*1";
    const phenotype = getPhenotype(gene, diplotype);
    const risk = getRisk(drug as SupportedDrug, phenotype);
    const confidence = getConfidence(variants, gene, geneWasSequenced);
    const geneVariants = variants.filter((v) => v.gene === gene);

    return {
      patient_id: patientId,
      drug,
      timestamp,
      risk_assessment: {
        risk_label: risk.risk_label,
        confidence_score: confidence,
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
        summary: risk.action,
        action: risk.action,
        alternative_drugs: risk.alternatives,
        guideline_reference: CPIC_REFERENCES[drug as SupportedDrug],
      },
      quality_metrics: {
        vcf_parsing_success: true,
        variants_detected: variants.length,
        genes_analyzed: genesAnalyzed,
      },
    };
  });

  return { results };
}

// ─── VCF Templates ────────────────────────────────────────────────────────────

const ALL_NORMAL_VCF = [
  "##fileformat=VCFv4.2",
  '##INFO=<ID=GENE,Number=1,Type=String,Description="Gene symbol">',
  '##INFO=<ID=STAR,Number=1,Type=String,Description="Star allele">',
  '##INFO=<ID=RS,Number=1,Type=String,Description="rsID">',
  "##SAMPLE=<ID=PATIENT_NM_001>",
  "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tPATIENT_NM_001",
  "chr22\t42522613\trs3892097\tC\tT\t.\tPASS\tGENE=CYP2D6;STAR=*1;RS=rs3892097\tGT\t0/0",
  "chr10\t96741053\trs4244285\tG\tA\t.\tPASS\tGENE=CYP2C19;STAR=*1;RS=rs4244285\tGT\t0/0",
  "chr10\t96702047\trs1799853\tC\tT\t.\tPASS\tGENE=CYP2C9;STAR=*1;RS=rs1799853\tGT\t0/0",
  "chr12\t21331549\trs4149056\tT\tC\t.\tPASS\tGENE=SLCO1B1;STAR=*1a;RS=rs4149056\tGT\t0/0",
  "chr6\t18128553\trs1800460\tG\tA\t.\tPASS\tGENE=TPMT;STAR=*1;RS=rs1800460\tGT\t0/0",
  "chr1\t97981395\trs3918290\tC\tT\t.\tPASS\tGENE=DPYD;STAR=*1;RS=rs3918290\tGT\t0/0",
].join("\n");

const CODEINE_PM_VCF = [
  "##fileformat=VCFv4.2",
  '##INFO=<ID=GENE,Number=1,Type=String,Description="Gene symbol">',
  '##INFO=<ID=STAR,Number=1,Type=String,Description="Star allele">',
  '##INFO=<ID=RS,Number=1,Type=String,Description="rsID">',
  "##SAMPLE=<ID=PATIENT_PM_001>",
  "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tPATIENT_PM_001",
  "chr22\t42522613\trs3892097\tC\tT\t.\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097\tGT\t0/1",
  "chr22\t42523943\trs5030867\tA\tG\t.\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs5030867\tGT\t0/1",
].join("\n");

const MULTI_RISK_VCF = [
  "##fileformat=VCFv4.2",
  '##INFO=<ID=GENE,Number=1,Type=String,Description="Gene symbol">',
  '##INFO=<ID=STAR,Number=1,Type=String,Description="Star allele">',
  '##INFO=<ID=RS,Number=1,Type=String,Description="rsID">',
  "##SAMPLE=<ID=PATIENT_MULTI_001>",
  "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tPATIENT_MULTI_001",
  "chr22\t42522613\trs3892097\tC\tT\t.\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097\tGT\t0/1",
  "chr10\t96741053\trs4244285\tG\tA\t.\tPASS\tGENE=CYP2C19;STAR=*2;RS=rs4244285\tGT\t0/1",
  "chr10\t96741053\trs4244286\tG\tA\t.\tPASS\tGENE=CYP2C19;STAR=*2;RS=rs4244286\tGT\t0/1",
  "chr10\t96702047\trs1799853\tC\tT\t.\tPASS\tGENE=CYP2C9;STAR=*2;RS=rs1799853\tGT\t0/1",
  "chr12\t21331549\trs4149056\tT\tC\t.\tPASS\tGENE=SLCO1B1;STAR=*5;RS=rs4149056\tGT\t0/1",
  "chr6\t18128553\trs1800460\tG\tA\t.\tPASS\tGENE=TPMT;STAR=*3A;RS=rs1800460\tGT\t0/1",
  "chr1\t97981395\trs3918290\tC\tT\t.\tPASS\tGENE=DPYD;STAR=*2A;RS=rs3918290\tGT\t0/1",
].join("\n");

// ─── Existing Sample File Tests (matching test-logic.mjs) ─────────────────────

describe("Integration — Existing test-logic.mjs Cases", () => {
  it("sample_codeine_pm.vcf + CODEINE → Ineffective", () => {
    const { results } = simulateAnalyzePipeline(CODEINE_PM_VCF, ["CODEINE"]);
    expect(results).toHaveLength(1);
    expect(results[0].risk_assessment.risk_label).toBe("Ineffective");
    expect(results[0].pharmacogenomic_profile.diplotype).toBe("*4/*4");
    expect(results[0].pharmacogenomic_profile.phenotype).toBe("PM");
  });

  it("sample_all_normal.vcf + CODEINE → Safe", () => {
    const { results } = simulateAnalyzePipeline(ALL_NORMAL_VCF, ["CODEINE"]);
    expect(results[0].risk_assessment.risk_label).toBe("Safe");
  });

  it("sample_all_normal.vcf + WARFARIN → Safe", () => {
    const { results } = simulateAnalyzePipeline(ALL_NORMAL_VCF, ["WARFARIN"]);
    expect(results[0].risk_assessment.risk_label).toBe("Safe");
  });

  it("sample_all_normal.vcf + AZATHIOPRINE → Safe", () => {
    const { results } = simulateAnalyzePipeline(ALL_NORMAL_VCF, ["AZATHIOPRINE"]);
    expect(results[0].risk_assessment.risk_label).toBe("Safe");
  });

  it("sample_multi_risk.vcf + CLOPIDOGREL → Ineffective", () => {
    const { results } = simulateAnalyzePipeline(MULTI_RISK_VCF, ["CLOPIDOGREL"]);
    expect(results[0].risk_assessment.risk_label).toBe("Ineffective");
    expect(results[0].pharmacogenomic_profile.diplotype).toBe("*2/*2");
    expect(results[0].pharmacogenomic_profile.phenotype).toBe("PM");
  });

  it("sample_multi_risk.vcf + AZATHIOPRINE → Adjust Dosage", () => {
    const { results } = simulateAnalyzePipeline(MULTI_RISK_VCF, ["AZATHIOPRINE"]);
    expect(results[0].risk_assessment.risk_label).toBe("Adjust Dosage");
    expect(results[0].pharmacogenomic_profile.diplotype).toBe("*1/*3A");
    expect(results[0].pharmacogenomic_profile.phenotype).toBe("IM");
  });

  it("sample_multi_risk.vcf + FLUOROURACIL → Adjust Dosage", () => {
    const { results } = simulateAnalyzePipeline(MULTI_RISK_VCF, ["FLUOROURACIL"]);
    expect(results[0].risk_assessment.risk_label).toBe("Adjust Dosage");
    expect(results[0].pharmacogenomic_profile.diplotype).toBe("*1/*2A");
    expect(results[0].pharmacogenomic_profile.phenotype).toBe("IM");
  });
});

// ─── All Normal → All Drugs Safe ──────────────────────────────────────────────

describe("Integration — All Normal Patient", () => {
  // Core 6 drugs from problem statement
  const coreDrugs: SupportedDrug[] = [
    "CODEINE", "WARFARIN", "CLOPIDOGREL",
    "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL",
  ];

  it("all 6 core drugs return Safe for all-normal VCF", () => {
    const { results } = simulateAnalyzePipeline(ALL_NORMAL_VCF, coreDrugs);
    expect(results).toHaveLength(6);
    for (const r of results) {
      expect(r.risk_assessment.risk_label).toBe("Safe");
      expect(r.risk_assessment.severity).toBe("none");
    }
  });

  it("all drugs have NM phenotype for all-normal VCF", () => {
    const { results } = simulateAnalyzePipeline(ALL_NORMAL_VCF, coreDrugs);
    for (const r of results) {
      expect(r.pharmacogenomic_profile.phenotype).toBe("NM");
    }
  });
});

// ─── Multi Risk → Various Drugs ───────────────────────────────────────────────

describe("Integration — Multi Risk Patient", () => {
  it("CODEINE → Adjust Dosage (CYP2D6 *1/*4 = IM)", () => {
    const { results } = simulateAnalyzePipeline(MULTI_RISK_VCF, ["CODEINE"]);
    expect(results[0].risk_assessment.risk_label).toBe("Adjust Dosage");
    expect(results[0].pharmacogenomic_profile.diplotype).toBe("*1/*4");
    expect(results[0].risk_assessment.confidence_score).toBe(0.85); // single allele inferred
  });

  it("WARFARIN → Adjust Dosage (CYP2C9 *1/*2 = IM)", () => {
    const { results } = simulateAnalyzePipeline(MULTI_RISK_VCF, ["WARFARIN"]);
    expect(results[0].risk_assessment.risk_label).toBe("Adjust Dosage");
    expect(results[0].pharmacogenomic_profile.diplotype).toBe("*1/*2");
  });

  it("SIMVASTATIN → Adjust Dosage (SLCO1B1 *1/*5 = IM)", () => {
    const { results } = simulateAnalyzePipeline(MULTI_RISK_VCF, ["SIMVASTATIN"]);
    expect(results[0].risk_assessment.risk_label).toBe("Adjust Dosage");
    expect(results[0].pharmacogenomic_profile.diplotype).toBe("*1/*5");
  });
});

// ─── JSON Output Schema Compliance ────────────────────────────────────────────

describe("Integration — JSON Output Schema", () => {
  it("output has all required top-level fields", () => {
    const { results } = simulateAnalyzePipeline(ALL_NORMAL_VCF, ["CODEINE"]);
    const r = results[0];

    // Required fields from the hackathon schema
    expect(r).toHaveProperty("patient_id");
    expect(r).toHaveProperty("drug");
    expect(r).toHaveProperty("timestamp");
    expect(r).toHaveProperty("risk_assessment");
    expect(r).toHaveProperty("pharmacogenomic_profile");
    expect(r).toHaveProperty("clinical_recommendation");
    expect(r).toHaveProperty("quality_metrics");
  });

  it("risk_assessment has correct structure", () => {
    const { results } = simulateAnalyzePipeline(ALL_NORMAL_VCF, ["CODEINE"]);
    const ra = results[0].risk_assessment;

    expect(ra).toHaveProperty("risk_label");
    expect(ra).toHaveProperty("confidence_score");
    expect(ra).toHaveProperty("severity");
    expect(typeof ra.risk_label).toBe("string");
    expect(typeof ra.confidence_score).toBe("number");
    expect(typeof ra.severity).toBe("string");
    expect(ra.confidence_score).toBeGreaterThanOrEqual(0);
    expect(ra.confidence_score).toBeLessThanOrEqual(1);
  });

  it("pharmacogenomic_profile has correct structure", () => {
    const { results } = simulateAnalyzePipeline(CODEINE_PM_VCF, ["CODEINE"]);
    const pp = results[0].pharmacogenomic_profile;

    expect(pp).toHaveProperty("primary_gene");
    expect(pp).toHaveProperty("diplotype");
    expect(pp).toHaveProperty("phenotype");
    expect(pp).toHaveProperty("detected_variants");
    expect(typeof pp.primary_gene).toBe("string");
    expect(typeof pp.diplotype).toBe("string");
    expect(typeof pp.phenotype).toBe("string");
    expect(Array.isArray(pp.detected_variants)).toBe(true);
  });

  it("detected_variants have correct structure", () => {
    const { results } = simulateAnalyzePipeline(CODEINE_PM_VCF, ["CODEINE"]);
    const dv = results[0].pharmacogenomic_profile.detected_variants;

    expect(dv.length).toBeGreaterThan(0);
    for (const v of dv) {
      expect(v).toHaveProperty("rsid");
      expect(v).toHaveProperty("gene");
      expect(v).toHaveProperty("star_allele");
      expect(typeof v.rsid).toBe("string");
      expect(v.rsid).toMatch(/^rs\d+$/);
    }
  });

  it("clinical_recommendation has correct structure", () => {
    const { results } = simulateAnalyzePipeline(ALL_NORMAL_VCF, ["CODEINE"]);
    const cr = results[0].clinical_recommendation;

    expect(cr).toHaveProperty("summary");
    expect(cr).toHaveProperty("action");
    expect(cr).toHaveProperty("guideline_reference");
    expect(typeof cr.summary).toBe("string");
    expect(typeof cr.action).toBe("string");
    expect(typeof cr.guideline_reference).toBe("string");
    expect(cr.guideline_reference).toContain("CPIC");
  });

  it("quality_metrics has correct structure", () => {
    const { results } = simulateAnalyzePipeline(ALL_NORMAL_VCF, ["CODEINE"]);
    const qm = results[0].quality_metrics;

    expect(qm).toHaveProperty("vcf_parsing_success");
    expect(qm).toHaveProperty("variants_detected");
    expect(qm).toHaveProperty("genes_analyzed");
    expect(typeof qm.vcf_parsing_success).toBe("boolean");
    expect(typeof qm.variants_detected).toBe("number");
    expect(Array.isArray(qm.genes_analyzed)).toBe(true);
  });

  it("risk_label is one of the valid enum values", () => {
    const validLabels = ["Safe", "Adjust Dosage", "Toxic", "Ineffective", "Unknown"];
    const drugs: SupportedDrug[] = ["CODEINE", "WARFARIN", "CLOPIDOGREL", "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL"];

    for (const vcf of [ALL_NORMAL_VCF, CODEINE_PM_VCF, MULTI_RISK_VCF]) {
      const { results } = simulateAnalyzePipeline(vcf, drugs);
      for (const r of results) {
        expect(validLabels).toContain(r.risk_assessment.risk_label);
      }
    }
  });

  it("severity is one of the valid enum values", () => {
    const validSeverities = ["none", "low", "moderate", "high", "critical"];
    const drugs: SupportedDrug[] = ["CODEINE", "WARFARIN", "CLOPIDOGREL", "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL"];

    for (const vcf of [ALL_NORMAL_VCF, CODEINE_PM_VCF, MULTI_RISK_VCF]) {
      const { results } = simulateAnalyzePipeline(vcf, drugs);
      for (const r of results) {
        expect(validSeverities).toContain(r.risk_assessment.severity);
      }
    }
  });

  it("phenotype is one of the valid enum values", () => {
    const validPhenotypes = ["PM", "IM", "NM", "RM", "URM", "Unknown"];
    const drugs: SupportedDrug[] = ["CODEINE", "WARFARIN", "CLOPIDOGREL", "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL"];

    for (const vcf of [ALL_NORMAL_VCF, CODEINE_PM_VCF, MULTI_RISK_VCF]) {
      const { results } = simulateAnalyzePipeline(vcf, drugs);
      for (const r of results) {
        expect(validPhenotypes).toContain(r.pharmacogenomic_profile.phenotype);
      }
    }
  });

  it("guideline_reference includes PMID for every drug", () => {
    const coreDrugs: SupportedDrug[] = [
      "CODEINE", "WARFARIN", "CLOPIDOGREL",
      "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL",
    ];
    const { results } = simulateAnalyzePipeline(ALL_NORMAL_VCF, coreDrugs);
    for (const r of results) {
      expect(r.clinical_recommendation.guideline_reference).toMatch(/PMID:\s*\d+/);
    }
  });
});

// ─── Confidence Score Integration ─────────────────────────────────────────────

describe("Integration — Confidence Scores", () => {
  it("all-normal VCF: genes detected but no carrier variants → confidence 0.95", () => {
    // Each gene is sequenced (0/0) but patient carries no ALT alleles
    const { results } = simulateAnalyzePipeline(ALL_NORMAL_VCF, ["CODEINE"]);
    expect(results[0].risk_assessment.confidence_score).toBe(0.95);
  });

  it("codeine PM VCF: CYP2D6 has 2 alleles → confidence 0.95", () => {
    const { results } = simulateAnalyzePipeline(CODEINE_PM_VCF, ["CODEINE"]);
    expect(results[0].risk_assessment.confidence_score).toBe(0.95);
  });

  it("multi-risk VCF: CYP2C19 has 2 alleles → 0.95, CYP2D6 has 1 → 0.85", () => {
    const { results } = simulateAnalyzePipeline(MULTI_RISK_VCF, ["CLOPIDOGREL", "CODEINE"]);
    const clopidogrelResult = results.find((r) => r.drug === "CLOPIDOGREL")!;
    const codeineResult = results.find((r) => r.drug === "CODEINE")!;
    expect(clopidogrelResult.risk_assessment.confidence_score).toBe(0.95);
    expect(codeineResult.risk_assessment.confidence_score).toBe(0.85);
  });

  it("drug with no gene variants in file → confidence 0.30", () => {
    // Codeine PM VCF only has CYP2D6 variants, no CYP2C19
    const { results } = simulateAnalyzePipeline(CODEINE_PM_VCF, ["CLOPIDOGREL"], "TEST");
    expect(results[0].risk_assessment.confidence_score).toBe(0.30);
  });
});

// ─── Edge Case: Drug Whose Gene Has No Variants ──────────────────────────────

describe("Integration — Missing Gene Data", () => {
  it("querying a drug when its gene has no variants → diplotype *1/*1, phenotype NM, risk Safe", () => {
    // Codeine PM VCF only has CYP2D6 — querying WARFARIN (CYP2C9) should fall back
    const { results } = simulateAnalyzePipeline(CODEINE_PM_VCF, ["WARFARIN"], "TEST");
    expect(results[0].pharmacogenomic_profile.diplotype).toBe("*1/*1");
    expect(results[0].pharmacogenomic_profile.phenotype).toBe("NM");
    expect(results[0].risk_assessment.risk_label).toBe("Safe");
    expect(results[0].risk_assessment.confidence_score).toBe(0.30);
    // detected_variants should be empty for CYP2C9
    expect(results[0].pharmacogenomic_profile.detected_variants).toHaveLength(0);
  });
});

// ─── Edge Case: Multiple Drugs Per Request ────────────────────────────────────

describe("Integration — Multiple Drugs", () => {
  it("returns one result per drug in the order requested", () => {
    const drugs: SupportedDrug[] = ["CODEINE", "WARFARIN", "CLOPIDOGREL"];
    const { results } = simulateAnalyzePipeline(ALL_NORMAL_VCF, drugs);
    expect(results).toHaveLength(3);
    expect(results[0].drug).toBe("CODEINE");
    expect(results[1].drug).toBe("WARFARIN");
    expect(results[2].drug).toBe("CLOPIDOGREL");
  });

  it("each result has the same patient_id", () => {
    const drugs: SupportedDrug[] = ["CODEINE", "WARFARIN"];
    const { results } = simulateAnalyzePipeline(ALL_NORMAL_VCF, drugs);
    expect(results[0].patient_id).toBe(results[1].patient_id);
    expect(results[0].patient_id).toBe("PATIENT_NM_001");
  });

  it("each result has the same quality_metrics.variants_detected", () => {
    const drugs: SupportedDrug[] = ["CODEINE", "WARFARIN"];
    const { results } = simulateAnalyzePipeline(ALL_NORMAL_VCF, drugs);
    expect(results[0].quality_metrics.variants_detected).toBe(results[1].quality_metrics.variants_detected);
  });
});

// ─── Hackathon-Specific Edge Cases ────────────────────────────────────────────

describe("Integration — Hackathon Edge Cases", () => {
  it("handles VCF with all 6 genes at PM/risk alleles (worst case)", () => {
    const worstCaseVCF = [
      "##fileformat=VCFv4.2",
      '##INFO=<ID=GENE,Number=1,Type=String,Description="Gene symbol">',
      '##INFO=<ID=STAR,Number=1,Type=String,Description="Star allele">',
      '##INFO=<ID=RS,Number=1,Type=String,Description="rsID">',
      "##SAMPLE=<ID=WORST_CASE_001>",
      "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tWORST_CASE_001",
      "chr22\t42522613\trs3892097\tC\tT\t.\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097\tGT\t0/1",
      "chr22\t42523943\trs5030867\tA\tG\t.\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs5030867\tGT\t0/1",
      "chr10\t96741053\trs4244285\tG\tA\t.\tPASS\tGENE=CYP2C19;STAR=*2;RS=rs4244285\tGT\t0/1",
      "chr10\t96741054\trs4244286\tG\tA\t.\tPASS\tGENE=CYP2C19;STAR=*2;RS=rs4244286\tGT\t0/1",
      "chr10\t96702047\trs1799853\tC\tT\t.\tPASS\tGENE=CYP2C9;STAR=*3;RS=rs1799853\tGT\t0/1",
      "chr10\t96702048\trs1057910\tA\tC\t.\tPASS\tGENE=CYP2C9;STAR=*3;RS=rs1057910\tGT\t0/1",
      "chr12\t21331549\trs4149056\tT\tC\t.\tPASS\tGENE=SLCO1B1;STAR=*5;RS=rs4149056\tGT\t0/1",
      "chr12\t21331550\trs4149057\tT\tC\t.\tPASS\tGENE=SLCO1B1;STAR=*5;RS=rs4149057\tGT\t0/1",
      "chr6\t18128553\trs1800460\tG\tA\t.\tPASS\tGENE=TPMT;STAR=*3A;RS=rs1800460\tGT\t0/1",
      "chr6\t18128554\trs1142345\tA\tG\t.\tPASS\tGENE=TPMT;STAR=*3A;RS=rs1142345\tGT\t0/1",
      "chr1\t97981395\trs3918290\tC\tT\t.\tPASS\tGENE=DPYD;STAR=*2A;RS=rs3918290\tGT\t0/1",
      "chr1\t97981396\trs67376798\tT\tA\t.\tPASS\tGENE=DPYD;STAR=*2A;RS=rs67376798\tGT\t0/1",
    ].join("\n");

    const drugs: SupportedDrug[] = [
      "CODEINE", "CLOPIDOGREL", "WARFARIN", "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL",
    ];
    const { results } = simulateAnalyzePipeline(worstCaseVCF, drugs);
    expect(results).toHaveLength(6);

    const byDrug = Object.fromEntries(results.map((r) => [r.drug, r]));

    expect(byDrug.CODEINE.risk_assessment.risk_label).toBe("Ineffective");     // CYP2D6 PM
    expect(byDrug.CLOPIDOGREL.risk_assessment.risk_label).toBe("Ineffective"); // CYP2C19 PM
    expect(byDrug.WARFARIN.risk_assessment.risk_label).toBe("Adjust Dosage");  // CYP2C9 PM
    expect(byDrug.SIMVASTATIN.risk_assessment.risk_label).toBe("Toxic");       // SLCO1B1 PM
    expect(byDrug.AZATHIOPRINE.risk_assessment.risk_label).toBe("Toxic");      // TPMT PM
    expect(byDrug.FLUOROURACIL.risk_assessment.risk_label).toBe("Toxic");      // DPYD PM

    // All should have 0.95 confidence (2 alleles each)
    for (const r of results) {
      expect(r.risk_assessment.confidence_score).toBe(0.95);
    }
  });

  it("handles VCF where some genes have 2 alleles and some have 1", () => {
    const mixedVCF = [
      "##fileformat=VCFv4.2",
      '##INFO=<ID=GENE,Number=1,Type=String,Description="Gene symbol">',
      '##INFO=<ID=STAR,Number=1,Type=String,Description="Star allele">',
      '##INFO=<ID=RS,Number=1,Type=String,Description="rsID">',
      "##SAMPLE=<ID=MIXED_001>",
      "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tMIXED_001",
      // CYP2D6: 2 alleles → *4/*4 → PM
      "chr22\t42522613\trs3892097\tC\tT\t.\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097\tGT\t0/1",
      "chr22\t42523943\trs5030867\tA\tG\t.\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs5030867\tGT\t0/1",
      // CYP2C19: 1 allele → *1/*2 → IM (prepends *1)
      "chr10\t96741053\trs4244285\tG\tA\t.\tPASS\tGENE=CYP2C19;STAR=*2;RS=rs4244285\tGT\t0/1",
      // TPMT: not present → diplotype null → *1/*1 fallback → NM
    ].join("\n");

    const { results } = simulateAnalyzePipeline(mixedVCF, ["CODEINE", "CLOPIDOGREL", "AZATHIOPRINE"]);

    const codeine = results.find((r) => r.drug === "CODEINE")!;
    expect(codeine.risk_assessment.risk_label).toBe("Ineffective");
    expect(codeine.risk_assessment.confidence_score).toBe(0.95);

    const clopidogrel = results.find((r) => r.drug === "CLOPIDOGREL")!;
    expect(clopidogrel.risk_assessment.risk_label).toBe("Adjust Dosage");
    expect(clopidogrel.risk_assessment.confidence_score).toBe(0.85);

    const azathioprine = results.find((r) => r.drug === "AZATHIOPRINE")!;
    expect(azathioprine.risk_assessment.risk_label).toBe("Safe"); // no TPMT data → *1/*1 → NM → Safe
    expect(azathioprine.risk_assessment.confidence_score).toBe(0.30);
  });

  it("handles single-drug single-gene VCF (minimal input)", () => {
    const minimalVCF = [
      "##fileformat=VCFv4.2",
      "##SAMPLE=<ID=MIN_001>",
      "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tMIN_001",
      "chr22\t42522613\trs3892097\tC\tT\t.\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097\tGT\t0/1",
    ].join("\n");

    const { results } = simulateAnalyzePipeline(minimalVCF, ["CODEINE"]);
    expect(results).toHaveLength(1);
    expect(results[0].pharmacogenomic_profile.diplotype).toBe("*1/*4"); // *1 prepended
    expect(results[0].pharmacogenomic_profile.phenotype).toBe("IM");
    expect(results[0].risk_assessment.risk_label).toBe("Adjust Dosage");
    expect(results[0].risk_assessment.confidence_score).toBe(0.85);
  });

  it("handles 6 core drugs requested simultaneously", () => {
    const coreDrugs: SupportedDrug[] = [
      "CODEINE", "WARFARIN", "CLOPIDOGREL",
      "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL",
    ];
    const { results } = simulateAnalyzePipeline(MULTI_RISK_VCF, coreDrugs);
    expect(results).toHaveLength(6);
    // Each drug should have a valid risk_label
    const validLabels = ["Safe", "Adjust Dosage", "Toxic", "Ineffective", "Unknown"];
    for (const r of results) {
      expect(validLabels).toContain(r.risk_assessment.risk_label);
    }
  });

  it("genes_analyzed reflects genes detected in the VCF", () => {
    const { results } = simulateAnalyzePipeline(CODEINE_PM_VCF, ["CODEINE", "WARFARIN"], "TEST");
    // Only CYP2D6 is in the VCF (both as carrier variant and genesDetected)
    expect(results[0].quality_metrics.genes_analyzed).toEqual(["CYP2D6"]);
    expect(results[1].quality_metrics.genes_analyzed).toEqual(["CYP2D6"]);
  });

  it("alternative_drugs present for high-risk results", () => {
    const { results } = simulateAnalyzePipeline(CODEINE_PM_VCF, ["CODEINE"]);
    // CODEINE PM → Ineffective, should have alternatives
    expect(results[0].clinical_recommendation.alternative_drugs).toBeDefined();
    expect(results[0].clinical_recommendation.alternative_drugs!.length).toBeGreaterThan(0);
  });

  it("alternative_drugs undefined for Safe results", () => {
    const { results } = simulateAnalyzePipeline(ALL_NORMAL_VCF, ["CODEINE"]);
    expect(results[0].clinical_recommendation.alternative_drugs).toBeUndefined();
  });
});
