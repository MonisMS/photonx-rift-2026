import type { VCFVariant, SupportedGene } from "@/lib/types";

const SUPPORTED_GENES = new Set<string>([
  "CYP2D6", "CYP2C19", "CYP2C9", "SLCO1B1", "TPMT", "DPYD",
]);

// ─── INFO Tag Extractor ───────────────────────────────────────────────────────

function extractInfoTag(info: string, tag: string): string | null {
  const match = info.match(new RegExp(`(?:^|;)${tag}=([^;]+)`));
  return match ? match[1].trim() : null;
}

// ─── Single Line Parser ───────────────────────────────────────────────────────

function parseVariantLine(line: string): VCFVariant | null {
  if (line.startsWith("#") || !line.trim()) return null;

  const columns = line.split("\t");
  if (columns.length < 8) return null;

  const info = columns[7];
  const gene = extractInfoTag(info, "GENE");
  const star = extractInfoTag(info, "STAR");
  const rs   = extractInfoTag(info, "RS");

  if (!gene || !star || !rs) return null;
  if (!SUPPORTED_GENES.has(gene)) return null;

  return {
    gene:      gene as SupportedGene,
    starAllele: star,
    rsid:      rs.startsWith("rs") ? rs : `rs${rs}`,
  };
}

// ─── Patient ID Extractor ─────────────────────────────────────────────────────
// Tries to pull sample name from VCF header lines like:
// ##SAMPLE=<ID=PATIENT_001,...> or the last column header

function extractPatientId(lines: string[]): string {
  for (const line of lines) {
    if (line.startsWith("##SAMPLE=")) {
      const match = line.match(/ID=([^,>]+)/);
      if (match) return match[1];
    }
    if (line.startsWith("#CHROM")) {
      const cols = line.split("\t");
      if (cols.length >= 10) return cols[9].trim();
    }
  }
  return "PATIENT_001";
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

export interface ParsedVCF {
  variants: VCFVariant[];
  patientId: string;
  success: boolean;
  error?: string;
}

export function parseVCF(fileText: string): ParsedVCF {
  if (!fileText.includes("##fileformat=VCF")) {
    return { variants: [], patientId: "PATIENT_001", success: false, error: "Not a valid VCF file." };
  }

  const lines = fileText.split("\n");
  const patientId = extractPatientId(lines);

  const variants: VCFVariant[] = lines
    .map(parseVariantLine)
    .filter((v): v is VCFVariant => v !== null);

  return { variants, patientId, success: true };
}
