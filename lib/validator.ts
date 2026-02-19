import type { VCFVariant, SupportedGene, SupportedDrug } from "@/lib/types";

// ─── Allowed Values ───────────────────────────────────────────────────────────

const SUPPORTED_GENES = new Set<string>([
  "CYP2D6", "CYP2C19", "CYP2C9", "SLCO1B1", "TPMT", "DPYD",
]);

const SUPPORTED_DRUGS = new Set<string>([
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
  drugs: SupportedDrug[];
  patientId: string;
  error?: string;
}

export function validateRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, variants: [], drugs: [], patientId: "", error: "Invalid request body." };
  }

  const { variants, drugs, patientId } = body as Record<string, unknown>;

  // Validate patientId
  if (typeof patientId !== "string" || !patientId.trim()) {
    return { valid: false, variants: [], drugs: [], patientId: "", error: "Missing patient ID." };
  }

  // Validate variants array
  if (!Array.isArray(variants) || variants.length === 0) {
    return { valid: false, variants: [], drugs: [], patientId, error: "No variants provided." };
  }

  const validVariants = variants.filter(isValidVariant);
  if (validVariants.length === 0) {
    return { valid: false, variants: [], drugs: [], patientId, error: "No valid variants found after validation." };
  }

  // Validate drugs array
  if (!Array.isArray(drugs) || drugs.length === 0) {
    return { valid: false, variants: validVariants, drugs: [], patientId, error: "No drugs provided." };
  }

  const validDrugs = drugs.filter(
    (d): d is SupportedDrug => typeof d === "string" && SUPPORTED_DRUGS.has(d)
  );
  if (validDrugs.length === 0) {
    return {
      valid: false, variants: validVariants, drugs: [], patientId,
      error: `No supported drugs found. Supported: ${[...SUPPORTED_DRUGS].join(", ")}`,
    };
  }

  return { valid: true, variants: validVariants, drugs: validDrugs, patientId: patientId.trim() };
}
