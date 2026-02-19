import type {
  SupportedDrug,
  SupportedGene,
  Phenotype,
  RiskLabel,
  Severity,
  VCFVariant,
} from "@/lib/types";

// ─── Drug → Gene Map ──────────────────────────────────────────────────────────

export const DRUG_GENE_MAP: Record<SupportedDrug, SupportedGene> = {
  CODEINE:      "CYP2D6",
  WARFARIN:     "CYP2C9",
  CLOPIDOGREL:  "CYP2C19",
  SIMVASTATIN:  "SLCO1B1",
  AZATHIOPRINE: "TPMT",
  FLUOROURACIL: "DPYD",
  TRAMADOL:     "CYP2D6",
  OMEPRAZOLE:   "CYP2C19",
  CELECOXIB:    "CYP2C9",
  CAPECITABINE: "DPYD",
};

// ─── CPIC Guideline References ───────────────────────────────────────────────

export const CPIC_REFERENCES: Record<SupportedDrug, string> = {
  CODEINE:      "CPIC Guideline for CYP2D6 and Codeine Therapy (2019 Update) — PMID: 31006110",
  TRAMADOL:     "CPIC Guideline for CYP2D6 and Tramadol Therapy (2020) — PMID: 33387367",
  WARFARIN:     "CPIC Guideline for Pharmacogenetics-Guided Warfarin Dosing (2017 Update) — PMID: 28198005",
  CELECOXIB:    "CPIC Guideline for NSAIDs and CYP2C9 (2020) — PMID: 32189324",
  CLOPIDOGREL:  "CPIC Guideline for CYP2C19 and Clopidogrel Therapy (2022 Update) — PMID: 35034351",
  OMEPRAZOLE:   "CPIC Guideline for CYP2C19 and Proton Pump Inhibitor Dosing (2022) — PMID: 35034351",
  SIMVASTATIN:  "CPIC Guideline for SLCO1B1 and Simvastatin-Induced Myopathy (2022 Update) — PMID: 35152405",
  AZATHIOPRINE: "CPIC Guideline for TPMT/NUDT15 and Thiopurine Dosing (2018 Update) — PMID: 30447069",
  FLUOROURACIL: "CPIC Guideline for DPYD and Fluoropyrimidine Dosing (2017 Update) — PMID: 29152729",
  CAPECITABINE: "CPIC Guideline for DPYD and Fluoropyrimidine Dosing (2017 Update) — PMID: 29152729",
};

// ─── Diplotype → Phenotype Tables ────────────────────────────────────────────
// Key format: "ALLELE1/ALLELE2" — always sorted so lower allele comes first
// e.g. "*1/*4" not "*4/*1"

const CYP2D6_PHENOTYPE: Record<string, Phenotype> = {
  "*1/*1":   "NM", "*1/*2":   "NM", "*2/*2":   "NM",
  "*1/*4":   "IM", "*1/*5":   "IM", "*1/*6":   "IM",
  "*1/*10":  "IM", "*1/*41":  "IM", "*1/*17":  "IM",
  "*4/*4":   "PM", "*4/*5":   "PM", "*5/*5":   "PM",
  "*4/*6":   "PM", "*5/*6":   "PM",
  "*1xN/*1": "URM", "*2xN/*1": "URM", "*2xN/*2": "URM",
};

const CYP2C19_PHENOTYPE: Record<string, Phenotype> = {
  "*1/*1":   "NM",
  "*1/*2":   "IM", "*1/*3":   "IM",
  "*2/*2":   "PM", "*2/*3":   "PM", "*3/*3":   "PM",
  "*1/*17":  "RM",
  "*17/*17": "URM",
};

const CYP2C9_PHENOTYPE: Record<string, Phenotype> = {
  "*1/*1":   "NM",
  "*1/*2":   "IM", "*1/*3":   "IM",
  "*2/*2":   "PM", "*2/*3":   "PM", "*3/*3":   "PM",
};

const SLCO1B1_PHENOTYPE: Record<string, Phenotype> = {
  "*1a/*1a": "NM", "*1a/*1b": "NM", "*1b/*1b": "NM",
  // *1 (generic normal) mapped to NM when paired with *1a or *1b
  "*1/*1a":  "NM", "*1/*1b":  "NM", "*1/*1":   "NM",
  "*1a/*5":  "IM", "*1b/*5":  "IM", "*1a/*15": "IM", "*1b/*15": "IM",
  // *1 (generic normal) paired with risk alleles
  "*1/*5":   "IM", "*1/*15":  "IM",
  "*5/*5":   "PM", "*15/*15": "PM", "*5/*15":  "PM",
};

const TPMT_PHENOTYPE: Record<string, Phenotype> = {
  "*1/*1":   "NM",
  "*1/*2":   "IM", "*1/*3A":  "IM", "*1/*3B":  "IM", "*1/*3C":  "IM",
  "*2/*3A":  "PM", "*3A/*3A": "PM", "*3A/*3C": "PM", "*2/*3C":  "PM",
};

const DPYD_PHENOTYPE: Record<string, Phenotype> = {
  "*1/*1":    "NM",
  "*1/*2A":   "IM", "*1/*13":  "IM",
  "*2A/*2A":  "PM", "*13/*13": "PM", "*2A/*13": "PM",
};

const PHENOTYPE_TABLES: Record<SupportedGene, Record<string, Phenotype>> = {
  CYP2D6:  CYP2D6_PHENOTYPE,
  CYP2C19: CYP2C19_PHENOTYPE,
  CYP2C9:  CYP2C9_PHENOTYPE,
  SLCO1B1: SLCO1B1_PHENOTYPE,
  TPMT:    TPMT_PHENOTYPE,
  DPYD:    DPYD_PHENOTYPE,
};

// ─── Risk Table ───────────────────────────────────────────────────────────────

export interface RiskEntry {
  risk_label: RiskLabel;
  severity:   Severity;
  action:     string;
  alternatives?: string[];
}

type RiskTable = Partial<Record<Phenotype, RiskEntry>>;
const RISK_TABLES: Record<SupportedDrug, RiskTable> = {
  CODEINE: {
    PM:  { risk_label: "Ineffective",    severity: "low",      action: "CYP2D6 Poor Metabolizer cannot convert codeine to morphine. Select alternative analgesic.", alternatives: ["Tramadol", "Morphine", "Oxycodone"] },
    IM:  { risk_label: "Adjust Dosage",  severity: "moderate", action: "Slower codeine conversion. Use with caution and monitor for reduced efficacy." },
    NM:  { risk_label: "Safe",           severity: "none",     action: "Standard codeine dosing is appropriate." },
    URM: { risk_label: "Toxic",          severity: "critical", action: "Ultrarapid conversion to morphine — risk of fatal respiratory depression. AVOID codeine.", alternatives: ["Tramadol", "NSAIDs"] },
  },
  CLOPIDOGREL: {
    PM:  { risk_label: "Ineffective",    severity: "high",     action: "CYP2C19 Poor Metabolizer cannot activate clopidogrel. High risk of cardiovascular events. Use alternative.", alternatives: ["Prasugrel", "Ticagrelor"] },
    IM:  { risk_label: "Adjust Dosage",  severity: "moderate", action: "Reduced clopidogrel activation. Consider alternative antiplatelet therapy." },
    NM:  { risk_label: "Safe",           severity: "none",     action: "Standard clopidogrel dosing is appropriate." },
    RM:  { risk_label: "Safe",           severity: "none",     action: "Standard dosing is appropriate." },
    URM: { risk_label: "Adjust Dosage",  severity: "low",      action: "Higher active metabolite levels. Monitor for bleeding risk." },
  },
  WARFARIN: {
    PM:  { risk_label: "Adjust Dosage",  severity: "high",     action: "CYP2C9 Poor Metabolizer: warfarin accumulates. Reduce dose by 50-70%. Monitor INR closely." },
    IM:  { risk_label: "Adjust Dosage",  severity: "moderate", action: "Slower warfarin clearance. Reduce starting dose by 25-50%. Frequent INR monitoring required." },
    NM:  { risk_label: "Safe",           severity: "none",     action: "Standard warfarin dosing is appropriate. Routine INR monitoring." },
  },
  SIMVASTATIN: {
    PM:  { risk_label: "Toxic",          severity: "high",     action: "SLCO1B1 Poor Function: high risk of statin-induced myopathy. Avoid simvastatin. Use pravastatin or rosuvastatin.", alternatives: ["Pravastatin", "Rosuvastatin"] },
    IM:  { risk_label: "Adjust Dosage",  severity: "moderate", action: "Reduced hepatic uptake. Use lower simvastatin dose (≤20mg) or switch to pravastatin." },
    NM:  { risk_label: "Safe",           severity: "none",     action: "Standard simvastatin dosing is appropriate." },
  },
  AZATHIOPRINE: {
    PM:  { risk_label: "Toxic",          severity: "critical", action: "TPMT Poor Metabolizer: life-threatening bone marrow toxicity. AVOID azathioprine. Use alternative.", alternatives: ["Mycophenolate"] },
    IM:  { risk_label: "Adjust Dosage",  severity: "high",     action: "Reduce starting dose to 30-70% of standard. Monitor blood counts closely." },
    NM:  { risk_label: "Safe",           severity: "none",     action: "Standard azathioprine dosing is appropriate." },
  },
  FLUOROURACIL: {
    PM:  { risk_label: "Toxic",          severity: "critical", action: "DPYD Poor Metabolizer: severe/fatal fluorouracil toxicity likely. AVOID fluorouracil and capecitabine.", alternatives: ["Alternative chemotherapy regimen — consult oncologist"] },
    IM:  { risk_label: "Adjust Dosage",  severity: "high",     action: "Reduce starting dose by 25-50%. Monitor for toxicity at each cycle." },
    NM:  { risk_label: "Safe",           severity: "none",     action: "Standard fluorouracil dosing is appropriate." },
  },
  TRAMADOL: {
    PM:  { risk_label: "Ineffective",    severity: "low",      action: "CYP2D6 Poor Metabolizer cannot convert tramadol to active metabolite O-desmethyltramadol. Select alternative analgesic.", alternatives: ["Morphine", "Oxycodone"] },
    IM:  { risk_label: "Adjust Dosage",  severity: "moderate", action: "Reduced tramadol activation. Monitor for reduced efficacy and consider dose adjustment." },
    NM:  { risk_label: "Safe",           severity: "none",     action: "Standard tramadol dosing is appropriate." },
    URM: { risk_label: "Toxic",          severity: "high",     action: "Ultrarapid conversion to active metabolite — risk of respiratory depression and seizures. AVOID tramadol.", alternatives: ["NSAIDs", "Non-opioid analgesics"] },
  },
  OMEPRAZOLE: {
    PM:  { risk_label: "Adjust Dosage",  severity: "low",      action: "CYP2C19 PM — increased omeprazole exposure. Consider reducing dose by 50% for chronic use." },
    IM:  { risk_label: "Safe",           severity: "none",     action: "Standard omeprazole dosing is appropriate." },
    NM:  { risk_label: "Safe",           severity: "none",     action: "Standard omeprazole dosing is appropriate." },
    RM:  { risk_label: "Adjust Dosage",  severity: "moderate", action: "Rapid omeprazole metabolism may reduce efficacy. Consider dose increase or alternative PPI.", alternatives: ["Rabeprazole", "Esomeprazole"] },
    URM: { risk_label: "Ineffective",    severity: "moderate", action: "Ultrarapid CYP2C19 metabolism — standard dose likely insufficient. Switch to rabeprazole or use higher dose.", alternatives: ["Rabeprazole", "Esomeprazole"] },
  },
  CELECOXIB: {
    PM:  { risk_label: "Adjust Dosage",  severity: "high",     action: "CYP2C9 Poor Metabolizer: celecoxib accumulates. Reduce starting dose by 50%. Monitor for GI and cardiovascular adverse effects." },
    IM:  { risk_label: "Adjust Dosage",  severity: "moderate", action: "Slower celecoxib clearance. Start at lowest recommended dose and monitor for adverse effects." },
    NM:  { risk_label: "Safe",           severity: "none",     action: "Standard celecoxib dosing is appropriate." },
  },
  CAPECITABINE: {
    PM:  { risk_label: "Toxic",          severity: "critical", action: "DPYD Poor Metabolizer: severe/fatal capecitabine toxicity likely. AVOID capecitabine.", alternatives: ["Alternative chemotherapy regimen — consult oncologist"] },
    IM:  { risk_label: "Adjust Dosage",  severity: "high",     action: "Reduce capecitabine starting dose by 25-50%. Monitor for toxicity at each cycle." },
    NM:  { risk_label: "Safe",           severity: "none",     action: "Standard capecitabine dosing is appropriate." },
  },
};

// ─── Diplotype Builder ────────────────────────────────────────────────────────
// Collects all star alleles for a gene from variants and builds a sorted diplotype

export function buildDiplotype(variants: VCFVariant[], gene: SupportedGene): string | null {
  const alleles = variants
    .filter((v) => v.gene === gene)
    .map((v) => v.starAllele);

  if (alleles.length === 0) return null;

  // Take at most 2 alleles; sort numerically by star number for consistency
  // When numeric parts are equal, sort alphabetically by the full allele string
  const sorted = alleles
    .slice(0, 2)
    .sort((a, b) => {
      const numA = parseFloat(a.replace("*", "").replace(/[A-Za-z]/g, "")) || 0;
      const numB = parseFloat(b.replace("*", "").replace(/[A-Za-z]/g, "")) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });

  // If only one allele found, assume the other copy is *1 (normal)
  if (sorted.length === 1) sorted.unshift("*1");

  return `${sorted[0]}/${sorted[1]}`;
}

// ─── Phenotype Lookup ─────────────────────────────────────────────────────────

export function getPhenotype(gene: SupportedGene, diplotype: string): Phenotype {
  const table = PHENOTYPE_TABLES[gene];
  return table[diplotype] ?? "Unknown";
}

// ─── Risk Lookup ──────────────────────────────────────────────────────────────

export function getRisk(drug: SupportedDrug, phenotype: Phenotype): RiskEntry {
  const table = RISK_TABLES[drug];
  return (
    table[phenotype] ?? {
      risk_label:   "Unknown",
      severity:     "none",
      action:       "Insufficient pharmacogenomic data to make a recommendation. Consult a clinical pharmacist.",
    }
  );
}

// ─── Confidence Score ─────────────────────────────────────────────────────────

export function getConfidence(variants: VCFVariant[], gene: SupportedGene): number {
  const count = variants.filter((v) => v.gene === gene).length;
  if (count >= 2) return 0.95;
  if (count === 1) return 0.70;
  return 0.30;
}
