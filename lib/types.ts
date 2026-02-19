// ─── Enums ───────────────────────────────────────────────────────────────────

export type RiskLabel =
  | "Safe"
  | "Adjust Dosage"
  | "Toxic"
  | "Ineffective"
  | "Unknown";

export type Severity = "none" | "low" | "moderate" | "high" | "critical";

export type Phenotype = "PM" | "IM" | "NM" | "RM" | "URM" | "Unknown";

export type SupportedDrug =
  | "CODEINE"
  | "WARFARIN"
  | "CLOPIDOGREL"
  | "SIMVASTATIN"
  | "AZATHIOPRINE"
  | "FLUOROURACIL";

export type SupportedGene =
  | "CYP2D6"
  | "CYP2C19"
  | "CYP2C9"
  | "SLCO1B1"
  | "TPMT"
  | "DPYD";

// ─── VCF Parsing ─────────────────────────────────────────────────────────────

export interface VCFVariant {
  gene: SupportedGene;
  starAllele: string;  // e.g. "*4"
  rsid: string;        // e.g. "rs3892097"
}

// ─── Analysis Request ─────────────────────────────────────────────────────────

export interface AnalyzeRequest {
  patientId: string;
  variants: VCFVariant[];
  drugs: SupportedDrug[];
}

// ─── Analysis Result (matches exact JSON schema from problem statement) ───────

export interface DetectedVariant {
  rsid: string;
  gene: string;
  star_allele: string;
}

export interface RiskAssessment {
  risk_label: RiskLabel;
  confidence_score: number;
  severity: Severity;
}

export interface PharmacogenomicProfile {
  primary_gene: string;
  diplotype: string;
  phenotype: Phenotype;
  detected_variants: DetectedVariant[];
}

export interface ClinicalRecommendation {
  summary: string;
  action: string;
  alternative_drugs?: string[];
}

export interface LLMExplanation {
  summary: string;
  mechanism: string;
  recommendation: string;
  citations: string;
}

export interface QualityMetrics {
  vcf_parsing_success: boolean;
  variants_detected: number;
  genes_analyzed: string[];
}

export interface AnalysisResult {
  patient_id: string;
  drug: string;
  timestamp: string;
  risk_assessment: RiskAssessment;
  pharmacogenomic_profile: PharmacogenomicProfile;
  clinical_recommendation: ClinicalRecommendation;
  llm_generated_explanation: LLMExplanation;
  quality_metrics: QualityMetrics;
}
