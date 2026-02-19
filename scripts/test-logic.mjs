// Quick logic test — run with: node scripts/test-logic.mjs
// Tests VCF parsing + CPIC tables without needing the browser or Gemini

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Inline the logic (mirrors lib/ files) ───────────────────────────────────

const SUPPORTED_GENES = new Set(["CYP2D6","CYP2C19","CYP2C9","SLCO1B1","TPMT","DPYD"]);

function extractInfoTag(info, tag) {
  const match = info.match(new RegExp(`(?:^|;)${tag}=([^;]+)`));
  return match ? match[1].trim() : null;
}

function parseVCF(text) {
  if (!text.includes("##fileformat=VCF")) return { variants: [], patientId: "PATIENT_001" };
  const lines = text.split("\n");
  let patientId = "PATIENT_001";
  const variants = [];
  for (const line of lines) {
    if (line.startsWith("##SAMPLE=")) {
      const m = line.match(/ID=([^,>]+)/); if (m) patientId = m[1];
    }
    if (line.startsWith("#") || !line.trim()) continue;
    const cols = line.split("\t"); if (cols.length < 8) continue;
    const gene = extractInfoTag(cols[7], "GENE");
    const star = extractInfoTag(cols[7], "STAR");
    const rs   = extractInfoTag(cols[7], "RS");
    if (!gene || !star || !rs || !SUPPORTED_GENES.has(gene)) continue;
    variants.push({ gene, starAllele: star, rsid: rs.startsWith("rs") ? rs : `rs${rs}` });
  }
  return { variants, patientId };
}

const DRUG_GENE_MAP = {
  CODEINE:"CYP2D6", WARFARIN:"CYP2C9", CLOPIDOGREL:"CYP2C19",
  SIMVASTATIN:"SLCO1B1", AZATHIOPRINE:"TPMT", FLUOROURACIL:"DPYD",
};

const PHENOTYPE_TABLES = {
  CYP2D6: { "*1/*1":"NM","*1/*2":"NM","*2/*2":"NM","*1/*4":"IM","*1/*5":"IM","*1/*6":"IM","*1/*10":"IM","*1/*41":"IM","*4/*4":"PM","*4/*5":"PM","*5/*5":"PM","*4/*6":"PM","*1xN/*1":"URM","*2xN/*1":"URM","*2xN/*2":"URM" },
  CYP2C19:{ "*1/*1":"NM","*1/*2":"IM","*1/*3":"IM","*2/*2":"PM","*2/*3":"PM","*3/*3":"PM","*1/*17":"RM","*17/*17":"URM" },
  CYP2C9: { "*1/*1":"NM","*1/*2":"IM","*1/*3":"IM","*2/*2":"PM","*2/*3":"PM","*3/*3":"PM" },
  SLCO1B1:{ "*1a/*1a":"NM","*1a/*1b":"NM","*1b/*1b":"NM","*1a/*5":"IM","*1b/*5":"IM","*1a/*15":"IM","*1b/*15":"IM","*5/*5":"PM","*15/*15":"PM","*5/*15":"PM" },
  TPMT:   { "*1/*1":"NM","*1/*2":"IM","*1/*3A":"IM","*1/*3B":"IM","*1/*3C":"IM","*2/*3A":"PM","*3A/*3A":"PM","*3A/*3C":"PM","*2/*3C":"PM" },
  DPYD:   { "*1/*1":"NM","*1/*2A":"IM","*1/*13":"IM","*2A/*2A":"PM","*13/*13":"PM","*2A/*13":"PM" },
};

const RISK_MAP = {
  CODEINE:      { PM:"Ineffective", IM:"Adjust Dosage", NM:"Safe", URM:"Toxic" },
  CLOPIDOGREL:  { PM:"Ineffective", IM:"Adjust Dosage", NM:"Safe", RM:"Safe",  URM:"Adjust Dosage" },
  WARFARIN:     { PM:"Adjust Dosage", IM:"Adjust Dosage", NM:"Safe" },
  SIMVASTATIN:  { PM:"Toxic", IM:"Adjust Dosage", NM:"Safe" },
  AZATHIOPRINE: { PM:"Toxic", IM:"Adjust Dosage", NM:"Safe" },
  FLUOROURACIL: { PM:"Toxic", IM:"Adjust Dosage", NM:"Safe" },
};

function buildDiplotype(variants, gene) {
  const alleles = variants.filter(v => v.gene === gene).map(v => v.starAllele).slice(0,2);
  if (!alleles.length) return null;
  if (alleles.length === 1) alleles.unshift("*1");
  alleles.sort((a,b) => (parseFloat(a.replace("*","").replace(/[A-Za-z]/g,""))||0) - (parseFloat(b.replace("*","").replace(/[A-Za-z]/g,""))||0));
  return `${alleles[0]}/${alleles[1]}`;
}

// ─── Run Tests ────────────────────────────────────────────────────────────────

const SAMPLES = [
  { file: "sample_codeine_pm.vcf",   drug: "CODEINE",       expected: "Ineffective" },
  { file: "sample_all_normal.vcf",   drug: "CODEINE",       expected: "Safe"        },
  { file: "sample_all_normal.vcf",   drug: "WARFARIN",      expected: "Safe"        },
  { file: "sample_all_normal.vcf",   drug: "AZATHIOPRINE",  expected: "Safe"        },
  { file: "sample_multi_risk.vcf",   drug: "CLOPIDOGREL",   expected: "Ineffective" },
  { file: "sample_multi_risk.vcf",   drug: "AZATHIOPRINE",  expected: "Adjust Dosage" },
  { file: "sample_multi_risk.vcf",   drug: "FLUOROURACIL",  expected: "Adjust Dosage" },
];

let passed = 0; let failed = 0;

for (const { file, drug, expected } of SAMPLES) {
  const text      = readFileSync(resolve(__dirname, `../public/samples/${file}`), "utf8");
  const { variants, patientId } = parseVCF(text);
  const gene      = DRUG_GENE_MAP[drug];
  const diplotype = buildDiplotype(variants, gene) ?? "*1/*1";
  const phenotype = PHENOTYPE_TABLES[gene]?.[diplotype] ?? "Unknown";
  const risk      = RISK_MAP[drug]?.[phenotype] ?? "Unknown";

  const ok = risk === expected;
  if (ok) passed++; else failed++;

  console.log(
    `${ok ? "✓" : "✗"} [${file}] ${drug} → diplotype: ${diplotype}, phenotype: ${phenotype}, risk: ${risk} ${ok ? "" : `(expected: ${expected})`}`
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
