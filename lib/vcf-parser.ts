import type { VCFVariant, SupportedGene } from "@/lib/types";

const SUPPORTED_GENES = new Set<string>([
  "CYP2D6", "CYP2C19", "CYP2C9", "SLCO1B1", "TPMT", "DPYD",
]);

// ─── INFO Tag Extractor ───────────────────────────────────────────────────────

function extractInfoTag(info: string, tag: string): string | null {
  const match = info.match(new RegExp(`(?:^|;)${tag}=([^;]+)`));
  return match ? match[1].trim() : null;
}

// ─── Genotype Extractor ──────────────────────────────────────────────────────
// Extracts the GT value from FORMAT + sample columns.
// Returns the number of ALT alleles: 0 for 0/0, 1 for 0/1, 2 for 1/1.
// Returns 1 (include once) when GT can't be determined (backward compat).

function getAltAlleleCount(columns: string[]): number {
  if (columns.length < 10) return 1; // no FORMAT/sample columns → include

  const format = columns[8];
  const sample = columns[9].trim().replace(/\r$/, "");

  const formatFields = format.split(":");
  const gtIndex = formatFields.indexOf("GT");
  if (gtIndex < 0) return 1; // no GT field → include

  const sampleFields = sample.split(":");
  const gt = sampleFields[gtIndex];
  if (!gt) return 1;

  // GT uses / (unphased) or | (phased) as separator
  const alleles = gt.split(/[/|]/);
  return alleles.filter((a) => a === "1").length;
}

// ─── Single Line Parser ───────────────────────────────────────────────────────
// Returns { gene, variant, altCount } or null. altCount is 0/1/2 from GT field.

interface ParsedLine {
  gene: SupportedGene;
  variant: VCFVariant;
  altCount: number;
}

function parseVariantLine(line: string): ParsedLine | null {
  if (line.startsWith("#") || !line.trim()) return null;

  const columns = line.split("\t");
  if (columns.length < 8) return null;

  const info = columns[7];
  const gene = extractInfoTag(info, "GENE");
  const star = extractInfoTag(info, "STAR");
  const rs   = extractInfoTag(info, "RS");

  if (!gene || !star || !rs) return null;
  if (!SUPPORTED_GENES.has(gene)) return null;

  const altCount = getAltAlleleCount(columns);

  return {
    gene: gene as SupportedGene,
    variant: {
      gene:       gene as SupportedGene,
      starAllele: star,
      rsid:       rs.startsWith("rs") ? rs : `rs${rs}`,
    },
    altCount,
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
  genesDetected: SupportedGene[];
  success: boolean;
  error?: string;
}

export function parseVCF(fileText: string): ParsedVCF {
  const empty: ParsedVCF = { variants: [], patientId: "PATIENT_001", genesDetected: [], success: false };

  if (!fileText.includes("##fileformat=VCF")) {
    return { ...empty, error: "Not a valid VCF file." };
  }

  const lines = fileText.split("\n");
  const patientId = extractPatientId(lines);

  const genesDetectedSet = new Set<SupportedGene>();
  const variants: VCFVariant[] = [];

  for (const line of lines) {
    const parsed = parseVariantLine(line);
    if (!parsed) continue;

    // Track every supported gene that appears in the file (regardless of GT)
    genesDetectedSet.add(parsed.gene);

    // Only include variants the patient actually carries (GT has ≥1 ALT allele)
    if (parsed.altCount >= 1) {
      variants.push(parsed.variant);
    }
    // Homozygous ALT (1/1) → push a second copy for buildDiplotype
    if (parsed.altCount >= 2) {
      variants.push(parsed.variant);
    }
  }

  return {
    variants,
    patientId,
    genesDetected: [...genesDetectedSet],
    success: true,
  };
}
