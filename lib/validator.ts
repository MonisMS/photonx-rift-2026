import type { VCFVariant, SupportedGene } from "@/lib/types";

// ─── Allowed Values ───────────────────────────────────────────────────────────

const SUPPORTED_GENES = new Set<string>([
  "CYP2D6", "CYP2C19", "CYP2C9", "SLCO1B1", "TPMT", "DPYD",
]);

// Core 6 drugs required by problem statement
export const CORE_DRUGS = new Set<string>([
  "CODEINE", "WARFARIN", "CLOPIDOGREL", "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL",
]);

// Extended hardcoded drugs with full phenotype tables
export const HARDCODED_DRUGS = new Set<string>([
  "CODEINE", "WARFARIN", "CLOPIDOGREL", "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL",
  "TRAMADOL", "OMEPRAZOLE", "CELECOXIB", "CAPECITABINE",
]);

const STAR_ALLELE_RE = /^\*[0-9]{1,3}[A-Za-z]*(?:xN)?$/;
const RSID_RE        = /^rs\d+$/;

// ─── Single Variant Validator ─────────────────────────────────────────────────

function isValidVariant(v: unknown): v is VCFVariant {
  if (!v || typeof v !== "object") return false;
  const { gene, starAllele, rsid } = v as Record<string, unknown>;
  return (
    typeof gene       === "string" && SUPPORTED_GENES.has(gene) &&
    typeof starAllele === "string" && STAR_ALLELE_RE.test(starAllele) &&
    typeof rsid       === "string" && RSID_RE.test(rsid)
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  variants: VCFVariant[];
  drugs: string[];  // Dynamic drugs (uppercase)
  patientId: string;
  genesDetected: SupportedGene[];
  error?: string;
}

export function validateRequest(body: unknown): ValidationResult {
  const fail = (error: string, partial?: Partial<ValidationResult>): ValidationResult => ({
    valid: false, variants: [], drugs: [], patientId: "", genesDetected: [], error, ...partial,
  });

  if (!body || typeof body !== "object") {
    return fail("Invalid request body.");
  }

  const { variants, drugs, patientId, genesDetected } = body as Record<string, unknown>;

  // Validate patientId
  if (typeof patientId !== "string" || !patientId.trim()) {
    return fail("Missing patient ID.");
  }

  // Validate variants array (can be empty when genesDetected covers the genes)
  if (!Array.isArray(variants)) {
    return fail("No variants provided.", { patientId });
  }

  const validVariants = variants.filter(isValidVariant);

  // Parse genesDetected (optional — older clients may not send it)
  const validGenes: SupportedGene[] = Array.isArray(genesDetected)
    ? genesDetected.filter((g): g is SupportedGene => typeof g === "string" && SUPPORTED_GENES.has(g))
    : [...new Set(validVariants.map((v) => v.gene))];

  // Must have either variants or detected genes
  if (validVariants.length === 0 && validGenes.length === 0) {
    return fail("No variants or sequenced genes provided.", { patientId });
  }

  // Validate drugs array
  if (!Array.isArray(drugs) || drugs.length === 0) {
    return fail("No drugs provided.", { patientId, variants: validVariants, genesDetected: validGenes });
  }

  // Accept any non-empty string as drug name (normalized to uppercase)
  const validDrugs = drugs
    .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
    .map((d) => d.trim().toUpperCase());
  
  if (validDrugs.length === 0) {
    return fail(
      "No valid drug names provided.",
      { patientId, variants: validVariants, genesDetected: validGenes },
    );
  }

  return { valid: true, variants: validVariants, drugs: validDrugs, patientId: patientId.trim(), genesDetected: validGenes };
}
