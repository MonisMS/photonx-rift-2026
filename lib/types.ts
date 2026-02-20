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
  | "FLUOROURACIL"
  | "TRAMADOL"
  | "OMEPRAZOLE"
  | "CELECOXIB"
  | "CAPECITABINE";

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
  guideline_reference: string;
}

export interface LLMExplanation {
  summary: string;
  mechanism: string;
  recommendation: string;
  citations: string;
}

// Decision trace for technical depth — proves deterministic rule engine
export interface DecisionTrace {
  lookup_source: string;      // e.g., "CPIC 2022 CYP2C19-Clopidogrel Table"
  phenotype_rule: string;     // e.g., "NM → standard dosing"
  evidence_level: string;     // e.g., "A", "B", or "N/A"
  classification_type: string; // "deterministic_table_lookup"
  confidence_reason?: string;  // Why this confidence score
  notes?: string;              // Additional context (e.g., VKORC1 note for warfarin)
}

export interface QualityMetrics {
  vcf_parsing_success: boolean;
  variants_detected: number;
  genes_analyzed: string[];
  decision_trace?: DecisionTrace;  // Nested inside quality_metrics for schema compliance
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
