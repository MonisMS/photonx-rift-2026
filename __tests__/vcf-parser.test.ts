import { describe, it, expect } from "vitest";
import { parseVCF } from "@/lib/vcf-parser";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal valid VCF header */
const VCF_HEADER = [
  "##fileformat=VCFv4.2",
  '##INFO=<ID=GENE,Number=1,Type=String,Description="Gene symbol">',
  '##INFO=<ID=STAR,Number=1,Type=String,Description="Star allele">',
  '##INFO=<ID=RS,Number=1,Type=String,Description="rsID">',
].join("\n");

/** Build a complete VCF from header + sample line + data lines */
function buildVCF(opts: {
  sampleHeader?: string;
  chromLine?: string;
  dataLines?: string[];
  extraHeaders?: string[];
}): string {
  const parts = [VCF_HEADER];
  if (opts.extraHeaders) parts.push(...opts.extraHeaders);
  if (opts.sampleHeader) parts.push(opts.sampleHeader);
  if (opts.chromLine) {
    parts.push(opts.chromLine);
  } else {
    parts.push("#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE");
  }
  if (opts.dataLines) parts.push(...opts.dataLines);
  return parts.join("\n");
}

/** Standard data line for a variant */
function variantLine(gene: string, star: string, rs: string): string {
  return `chr22\t42522613\t${rs}\tC\tT\t.\tPASS\tGENE=${gene};STAR=${star};RS=${rs}\tGT\t0/1`;
}

// ─── Basic Parsing ────────────────────────────────────────────────────────────

describe("VCF Parser — Basic Parsing", () => {
  it("parses a valid single-variant VCF", () => {
    const vcf = buildVCF({
      sampleHeader: "##SAMPLE=<ID=TEST_001>",
      dataLines: [variantLine("CYP2D6", "*4", "rs3892097")],
    });
    const result = parseVCF(vcf);
    expect(result.success).toBe(true);
    expect(result.patientId).toBe("TEST_001");
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0]).toEqual({
      gene: "CYP2D6",
      starAllele: "*4",
      rsid: "rs3892097",
    });
  });

  it("parses all 6 supported genes in a single file", () => {
    const vcf = buildVCF({
      sampleHeader: "##SAMPLE=<ID=MULTI_001>",
      dataLines: [
        variantLine("CYP2D6", "*1", "rs3892097"),
        variantLine("CYP2C19", "*2", "rs4244285"),
        variantLine("CYP2C9", "*3", "rs1057910"),
        variantLine("SLCO1B1", "*5", "rs4149056"),
        variantLine("TPMT", "*3A", "rs1800460"),
        variantLine("DPYD", "*2A", "rs3918290"),
      ],
    });
    const result = parseVCF(vcf);
    expect(result.success).toBe(true);
    expect(result.variants).toHaveLength(6);
    const genes = result.variants.map((v) => v.gene);
    expect(genes).toContain("CYP2D6");
    expect(genes).toContain("CYP2C19");
    expect(genes).toContain("CYP2C9");
    expect(genes).toContain("SLCO1B1");
    expect(genes).toContain("TPMT");
    expect(genes).toContain("DPYD");
  });

  it("parses two alleles for the same gene", () => {
    const vcf = buildVCF({
      sampleHeader: "##SAMPLE=<ID=PM_001>",
      dataLines: [
        variantLine("CYP2D6", "*4", "rs3892097"),
        variantLine("CYP2D6", "*4", "rs5030867"),
      ],
    });
    const result = parseVCF(vcf);
    expect(result.success).toBe(true);
    expect(result.variants).toHaveLength(2);
    expect(result.variants[0].starAllele).toBe("*4");
    expect(result.variants[1].starAllele).toBe("*4");
  });

  it("parses heterozygous diplotype (*1/*4) from two variant lines", () => {
    const vcf = buildVCF({
      dataLines: [
        variantLine("CYP2D6", "*1", "rs3892097"),
        variantLine("CYP2D6", "*4", "rs5030867"),
      ],
    });
    const result = parseVCF(vcf);
    expect(result.success).toBe(true);
    expect(result.variants).toHaveLength(2);
    expect(result.variants.map((v) => v.starAllele).sort()).toEqual(["*1", "*4"]);
  });
});

// ─── Patient ID Extraction ────────────────────────────────────────────────────

describe("VCF Parser — Patient ID", () => {
  it("extracts patient ID from ##SAMPLE header", () => {
    const vcf = buildVCF({
      sampleHeader: "##SAMPLE=<ID=PATIENT_ABC_123>",
      dataLines: [variantLine("CYP2D6", "*1", "rs3892097")],
    });
    expect(parseVCF(vcf).patientId).toBe("PATIENT_ABC_123");
  });

  it("extracts patient ID from #CHROM header (10th column)", () => {
    const vcf = buildVCF({
      chromLine: "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tJOHN_DOE",
      dataLines: [variantLine("CYP2D6", "*1", "rs3892097")],
    });
    expect(parseVCF(vcf).patientId).toBe("JOHN_DOE");
  });

  it("prefers ##SAMPLE over #CHROM when both present", () => {
    const vcf = buildVCF({
      sampleHeader: "##SAMPLE=<ID=FROM_SAMPLE>",
      chromLine: "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tFROM_CHROM",
      dataLines: [variantLine("CYP2D6", "*1", "rs3892097")],
    });
    // ##SAMPLE= appears first in lines, so it wins
    expect(parseVCF(vcf).patientId).toBe("FROM_SAMPLE");
  });

  it("defaults to PATIENT_001 when no patient info in headers", () => {
    const vcf = buildVCF({
      chromLine: "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT",
      dataLines: [variantLine("CYP2D6", "*1", "rs3892097")],
    });
    expect(parseVCF(vcf).patientId).toBe("PATIENT_001");
  });

  it("handles SAMPLE header with additional metadata", () => {
    const vcf = buildVCF({
      sampleHeader: "##SAMPLE=<ID=PAT_007,Genomes=Illumina,Sex=Male>",
      dataLines: [variantLine("CYP2D6", "*1", "rs3892097")],
    });
    expect(parseVCF(vcf).patientId).toBe("PAT_007");
  });
});

// ─── rsID Normalization ───────────────────────────────────────────────────────

describe("VCF Parser — rsID Handling", () => {
  it("keeps rs prefix when already present", () => {
    const vcf = buildVCF({
      dataLines: [variantLine("CYP2D6", "*1", "rs3892097")],
    });
    expect(parseVCF(vcf).variants[0].rsid).toBe("rs3892097");
  });

  it("prepends rs prefix when missing", () => {
    const line = `chr22\t42522613\t3892097\tC\tT\t.\tPASS\tGENE=CYP2D6;STAR=*1;RS=3892097\tGT\t0/1`;
    const vcf = buildVCF({ dataLines: [line] });
    expect(parseVCF(vcf).variants[0].rsid).toBe("rs3892097");
  });
});

// ─── Invalid/Malformed Files ──────────────────────────────────────────────────

describe("VCF Parser — Invalid Files", () => {
  it("rejects file without ##fileformat=VCF header", () => {
    const result = parseVCF("This is not a VCF file\nJust random text");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Not a valid VCF");
    expect(result.variants).toHaveLength(0);
  });

  it("rejects completely empty string", () => {
    const result = parseVCF("");
    expect(result.success).toBe(false);
  });

  it("returns empty variants for VCF with only headers (no data lines)", () => {
    const vcf = buildVCF({ dataLines: [] });
    const result = parseVCF(vcf);
    expect(result.success).toBe(true);
    expect(result.variants).toHaveLength(0);
  });

  it("skips lines with fewer than 8 columns", () => {
    const vcf = buildVCF({
      dataLines: [
        "chr22\t42522613\trs123\tC\tT",   // only 5 columns
        variantLine("CYP2D6", "*1", "rs3892097"), // valid
      ],
    });
    const result = parseVCF(vcf);
    expect(result.variants).toHaveLength(1);
  });

  it("skips lines missing GENE info tag", () => {
    const line = `chr22\t42522613\trs123\tC\tT\t.\tPASS\tSTAR=*4;RS=rs3892097\tGT\t0/1`;
    const vcf = buildVCF({ dataLines: [line] });
    expect(parseVCF(vcf).variants).toHaveLength(0);
  });

  it("skips lines missing STAR info tag", () => {
    const line = `chr22\t42522613\trs123\tC\tT\t.\tPASS\tGENE=CYP2D6;RS=rs3892097\tGT\t0/1`;
    const vcf = buildVCF({ dataLines: [line] });
    expect(parseVCF(vcf).variants).toHaveLength(0);
  });

  it("skips lines missing RS info tag", () => {
    const line = `chr22\t42522613\trs123\tC\tT\t.\tPASS\tGENE=CYP2D6;STAR=*4\tGT\t0/1`;
    const vcf = buildVCF({ dataLines: [line] });
    expect(parseVCF(vcf).variants).toHaveLength(0);
  });

  it("skips comment lines (starting with #)", () => {
    const vcf = buildVCF({
      dataLines: [
        "# This is a comment",
        variantLine("CYP2D6", "*1", "rs3892097"),
      ],
    });
    expect(parseVCF(vcf).variants).toHaveLength(1);
  });

  it("skips blank/whitespace-only lines", () => {
    const vcf = buildVCF({
      dataLines: [
        "",
        "   ",
        variantLine("CYP2D6", "*1", "rs3892097"),
        "",
      ],
    });
    expect(parseVCF(vcf).variants).toHaveLength(1);
  });
});

// ─── Unsupported Genes ────────────────────────────────────────────────────────

describe("VCF Parser — Gene Filtering", () => {
  it("skips unsupported gene names", () => {
    const vcf = buildVCF({
      dataLines: [
        variantLine("CYP3A4", "*22", "rs35599367"),  // not supported
        variantLine("CYP2D6", "*4", "rs3892097"),      // supported
      ],
    });
    const result = parseVCF(vcf);
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0].gene).toBe("CYP2D6");
  });

  it("skips HLA genes (not in supported set)", () => {
    const vcf = buildVCF({
      dataLines: [
        variantLine("HLA-B", "*57:01", "rs2395029"),
        variantLine("CYP2C9", "*2", "rs1799853"),
      ],
    });
    const result = parseVCF(vcf);
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0].gene).toBe("CYP2C9");
  });

  it("returns empty when all variants are for unsupported genes", () => {
    const vcf = buildVCF({
      dataLines: [
        variantLine("CYP3A4", "*22", "rs35599367"),
        variantLine("CYP1A2", "*1F", "rs762551"),
      ],
    });
    expect(parseVCF(vcf).variants).toHaveLength(0);
  });
});

// ─── Mixed Valid/Invalid Lines ────────────────────────────────────────────────

describe("VCF Parser — Mixed Content", () => {
  it("extracts valid variants from a file with mixed valid/invalid lines", () => {
    const vcf = buildVCF({
      sampleHeader: "##SAMPLE=<ID=MIXED_001>",
      dataLines: [
        variantLine("CYP2D6", "*4", "rs3892097"),                           // valid
        `chr22\t42522\trs999\tC\tT`,                                         // too few cols
        variantLine("CYP3A4", "*22", "rs35599367"),                          // unsupported gene
        `chr10\t96741053\trs4244285\tG\tA\t.\tPASS\tSTAR=*2;RS=rs4244285\tGT\t0/1`, // missing GENE
        variantLine("CYP2C19", "*2", "rs4244285"),                           // valid
      ],
    });
    const result = parseVCF(vcf);
    expect(result.variants).toHaveLength(2);
    expect(result.variants[0].gene).toBe("CYP2D6");
    expect(result.variants[1].gene).toBe("CYP2C19");
  });

  it("handles 3+ alleles for one gene (takes all, buildDiplotype limits to 2)", () => {
    const vcf = buildVCF({
      dataLines: [
        variantLine("CYP2D6", "*4", "rs3892097"),
        variantLine("CYP2D6", "*5", "rs5030867"),
        variantLine("CYP2D6", "*6", "rs5030655"),
      ],
    });
    // Parser should return all 3 — it's buildDiplotype's job to limit to 2
    const result = parseVCF(vcf);
    expect(result.variants).toHaveLength(3);
  });
});

// ─── INFO Tag Edge Cases ──────────────────────────────────────────────────────

describe("VCF Parser — INFO Tag Parsing", () => {
  it("handles INFO tags in any order", () => {
    const line = `chr22\t42522613\trs3892097\tC\tT\t.\tPASS\tRS=rs3892097;GENE=CYP2D6;STAR=*4\tGT\t0/1`;
    const vcf = buildVCF({ dataLines: [line] });
    const result = parseVCF(vcf);
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0].gene).toBe("CYP2D6");
    expect(result.variants[0].starAllele).toBe("*4");
  });

  it("handles INFO with additional non-standard tags", () => {
    const line = `chr22\t42522613\trs3892097\tC\tT\t.\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097;DP=45;AF=0.5\tGT\t0/1`;
    const vcf = buildVCF({ dataLines: [line] });
    const result = parseVCF(vcf);
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0].starAllele).toBe("*4");
  });

  it("handles star alleles with letter suffixes (*3A, *3B, *3C)", () => {
    const vcf = buildVCF({
      dataLines: [
        variantLine("TPMT", "*3A", "rs1800460"),
        variantLine("DPYD", "*2A", "rs3918290"),
      ],
    });
    const result = parseVCF(vcf);
    expect(result.variants[0].starAllele).toBe("*3A");
    expect(result.variants[1].starAllele).toBe("*2A");
  });

  it("handles SLCO1B1 alleles with letter suffixes (*1a, *1b)", () => {
    const vcf = buildVCF({
      dataLines: [
        variantLine("SLCO1B1", "*1a", "rs4149056"),
        variantLine("SLCO1B1", "*1b", "rs2306283"),
      ],
    });
    const result = parseVCF(vcf);
    expect(result.variants).toHaveLength(2);
    expect(result.variants[0].starAllele).toBe("*1a");
    expect(result.variants[1].starAllele).toBe("*1b");
  });

  it("handles copy-number star alleles (*1xN, *2xN)", () => {
    const vcf = buildVCF({
      dataLines: [
        variantLine("CYP2D6", "*2xN", "rs1234567"),
        variantLine("CYP2D6", "*1", "rs3892097"),
      ],
    });
    const result = parseVCF(vcf);
    expect(result.variants).toHaveLength(2);
    expect(result.variants[0].starAllele).toBe("*2xN");
  });
});

// ─── Real Sample File Content ─────────────────────────────────────────────────

describe("VCF Parser — Sample Files (inline)", () => {
  it("parses sample_all_normal content", () => {
    const vcf = [
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
    const result = parseVCF(vcf);
    expect(result.success).toBe(true);
    expect(result.patientId).toBe("PATIENT_NM_001");
    expect(result.variants).toHaveLength(6);
  });

  it("parses sample_codeine_pm content (CYP2D6 *4/*4)", () => {
    const vcf = [
      "##fileformat=VCFv4.2",
      '##INFO=<ID=GENE,Number=1,Type=String,Description="Gene symbol">',
      '##INFO=<ID=STAR,Number=1,Type=String,Description="Star allele">',
      '##INFO=<ID=RS,Number=1,Type=String,Description="rsID">',
      "##SAMPLE=<ID=PATIENT_PM_001>",
      "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tPATIENT_PM_001",
      "chr22\t42522613\trs3892097\tC\tT\t.\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097\tGT\t0/1",
      "chr22\t42523943\trs5030867\tA\tG\t.\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs5030867\tGT\t0/1",
    ].join("\n");
    const result = parseVCF(vcf);
    expect(result.success).toBe(true);
    expect(result.patientId).toBe("PATIENT_PM_001");
    expect(result.variants).toHaveLength(2);
    expect(result.variants.every((v) => v.gene === "CYP2D6" && v.starAllele === "*4")).toBe(true);
  });
});

// ─── Edge Cases That Hackathon Might Test ─────────────────────────────────────

describe("VCF Parser — Hackathon Edge Cases", () => {
  it("handles Windows line endings (\\r\\n)", () => {
    const vcf = [
      "##fileformat=VCFv4.2",
      "##SAMPLE=<ID=WIN_001>",
      "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tWIN_001",
      "chr22\t42522613\trs3892097\tC\tT\t.\tPASS\tGENE=CYP2D6;STAR=*4;RS=rs3892097\tGT\t0/1",
    ].join("\r\n");
    const result = parseVCF(vcf);
    expect(result.success).toBe(true);
    // Note: \r might remain in star allele or rsid — check trimming
    expect(result.variants.length).toBeGreaterThanOrEqual(1);
  });

  it("handles VCF v4.1 header", () => {
    const vcf = [
      "##fileformat=VCFv4.1",
      "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE",
      "chr22\t42522613\trs3892097\tC\tT\t.\tPASS\tGENE=CYP2D6;STAR=*1;RS=rs3892097\tGT\t0/0",
    ].join("\n");
    // Should still work since we check for "##fileformat=VCF" (includes v4.1)
    const result = parseVCF(vcf);
    expect(result.success).toBe(true);
  });

  it("handles VCF v4.3 header", () => {
    const vcf = [
      "##fileformat=VCFv4.3",
      "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE",
      "chr22\t42522613\trs3892097\tC\tT\t.\tPASS\tGENE=CYP2D6;STAR=*1;RS=rs3892097\tGT\t0/0",
    ].join("\n");
    const result = parseVCF(vcf);
    expect(result.success).toBe(true);
  });

  it("handles trailing newline at end of file", () => {
    const vcf = buildVCF({
      dataLines: [variantLine("CYP2D6", "*1", "rs3892097")],
    }) + "\n\n";
    const result = parseVCF(vcf);
    expect(result.variants).toHaveLength(1);
  });

  it("handles a file with ONLY the required 6 hackathon genes", () => {
    const vcf = buildVCF({
      sampleHeader: "##SAMPLE=<ID=HACKATHON_001>",
      dataLines: [
        variantLine("CYP2D6", "*4", "rs3892097"),
        variantLine("CYP2D6", "*4", "rs5030867"),
        variantLine("CYP2C9", "*2", "rs1799853"),
        variantLine("CYP2C9", "*3", "rs1057910"),
        variantLine("CYP2C19", "*2", "rs4244285"),
        variantLine("CYP2C19", "*2", "rs4244286"),
        variantLine("SLCO1B1", "*5", "rs4149056"),
        variantLine("SLCO1B1", "*5", "rs4149057"),
        variantLine("TPMT", "*3A", "rs1800460"),
        variantLine("TPMT", "*3A", "rs1142345"),
        variantLine("DPYD", "*2A", "rs3918290"),
        variantLine("DPYD", "*2A", "rs67376798"),
      ],
    });
    const result = parseVCF(vcf);
    expect(result.success).toBe(true);
    expect(result.variants).toHaveLength(12);
    const genes = [...new Set(result.variants.map((v) => v.gene))];
    expect(genes.sort()).toEqual(["CYP2C19", "CYP2C9", "CYP2D6", "DPYD", "SLCO1B1", "TPMT"]);
  });

  it("handles a large file with many non-pharmacogenomic variants mixed in", () => {
    const dataLines = [
      // Non-pharma lines (will be skipped)
      variantLine("BRCA1", "*1", "rs80357906"),
      variantLine("TP53", "*1", "rs28934578"),
      variantLine("EGFR", "*1", "rs121434568"),
      // Pharmacogenomic lines (will be kept)
      variantLine("CYP2D6", "*4", "rs3892097"),
      variantLine("TPMT", "*3A", "rs1800460"),
    ];
    const vcf = buildVCF({ dataLines });
    const result = parseVCF(vcf);
    expect(result.variants).toHaveLength(2);
  });
});
