/**
 * CPIC API Client with Caching
 * 
 * Fetches pharmacogenomic data from https://api.cpicpgx.org/
 * with in-memory caching and graceful fallback to hardcoded data.
 * 
 * API Documentation: https://cpicpgx.org/api/
 */

import type { SupportedDrug, SupportedGene, Phenotype, RiskLabel, Severity } from "@/lib/types";

// ─── Configuration ────────────────────────────────────────────────────────────

const CPIC_API_BASE = "https://api.cpicpgx.org/v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 5000; // 5 second timeout per request

// ─── CPIC API Response Types ──────────────────────────────────────────────────

export interface CPICDrug {
  drugid: string;           // e.g. "RxNorm:2670"
  name: string;             // e.g. "codeine"
  pharmgkbid: string;
  guidelineid: number | null;
  flowchart: string | null;
}

export interface CPICPair {
  pairid: number;
  genesymbol: string;       // e.g. "CYP2D6"
  drugid: string;           // e.g. "RxNorm:2670"
  guidelineid: number | null;
  cpiclevel: string;        // e.g. "A", "B", "C"
  citations: string[] | null;
  usedforrecommendation: boolean;
}

export interface CPICRecommendation {
  id: number;
  guidelineid: number;
  drugid: string;
  phenotypes: Record<string, string>;     // e.g. {"CYP2D6": "Poor Metabolizer"}
  implications: Record<string, string>;   // e.g. {"CYP2D6": "Reduced morphine formation"}
  drugrecommendation: string;
  classification: string;                 // "Strong", "Moderate", "No Recommendation"
  alternatedrugavailable: boolean;
  activityscore: Record<string, string>;  // e.g. {"CYP2D6": "0.0"}
  lookupkey: Record<string, string>;
}

export interface CPICDiplotype {
  genesymbol: string;
  diplotype: string;          // e.g. "*1/*4"
  generesult: string;         // e.g. "Intermediate Metabolizer"
  totalactivityscore: string;
  lookupkey: Record<string, string>;
}

// ─── Internal Types ───────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface APIRiskEntry {
  risk_label: RiskLabel;
  severity: Severity;
  action: string;
  implications: string;
  alternatives?: string[];
  classification: string;
  activityScore?: string;
}

// ─── In-Memory Cache ──────────────────────────────────────────────────────────

const cache = {
  drugs: null as CacheEntry<Map<string, CPICDrug>> | null,
  pairs: null as CacheEntry<Map<string, CPICPair[]>> | null,
  recommendations: new Map<string, CacheEntry<CPICRecommendation[]>>(),
  diplotypes: new Map<string, CacheEntry<Map<string, string>>>(),
};

// ─── Drug Name → RxNorm ID Mapping ────────────────────────────────────────────
// Static mapping since drug names are constant in our system

const DRUG_RXNORM_IDS: Record<SupportedDrug, string> = {
  CODEINE:      "RxNorm:2670",
  TRAMADOL:     "RxNorm:10689",
  WARFARIN:     "RxNorm:11289",
  CELECOXIB:    "RxNorm:140587",
  CLOPIDOGREL:  "RxNorm:32968",
  OMEPRAZOLE:   "RxNorm:7646",
  SIMVASTATIN:  "RxNorm:36567",
  AZATHIOPRINE: "RxNorm:1256",
  FLUOROURACIL: "RxNorm:4492",
  CAPECITABINE: "RxNorm:194000",
};

// ─── Phenotype Name Mapping ───────────────────────────────────────────────────
// CPIC uses full names, we use abbreviations

const PHENOTYPE_MAP: Record<string, Phenotype> = {
  "Poor Metabolizer":         "PM",
  "Intermediate Metabolizer": "IM",
  "Normal Metabolizer":       "NM",
  "Rapid Metabolizer":        "RM",
  "Ultrarapid Metabolizer":   "URM",
  "Indeterminate":            "Unknown",
  // SLCO1B1 uses different terminology
  "Poor Function":            "PM",
  "Decreased Function":       "IM",
  "Intermediate Function":    "IM",
  "Normal Function":          "NM",
  "Increased Function":       "NM",
};

// ─── Classification → Risk/Severity Mapping ───────────────────────────────────
// Derive risk labels from CPIC recommendation classification + content

function deriveRiskFromRecommendation(rec: CPICRecommendation, gene: SupportedGene): APIRiskEntry {
  const phenotypeName = rec.phenotypes[gene] || "";
  const phenotype = PHENOTYPE_MAP[phenotypeName] || "Unknown";
  const text = rec.drugrecommendation.toLowerCase();
  const implications = rec.implications[gene] || "";
  
  let risk_label: RiskLabel;
  let severity: Severity;
  
  // Parse recommendation text to determine risk level
  if (text.includes("avoid") || text.includes("not recommended")) {
    // Check if it's toxicity-related or ineffectiveness-related
    if (text.includes("toxicity") || text.includes("toxic") || implications.toLowerCase().includes("toxicity")) {
      risk_label = "Toxic";
      severity = rec.classification === "Strong" ? "critical" : "high";
    } else if (text.includes("diminished") || text.includes("ineffective") || implications.toLowerCase().includes("reduced") || implications.toLowerCase().includes("greatly reduced")) {
      risk_label = "Ineffective";
      severity = phenotype === "PM" ? "low" : "moderate"; // PM with no metabolism = ineffective but not dangerous
    } else {
      // Default to Toxic for "avoid" recommendations
      risk_label = "Toxic";
      severity = "high";
    }
  } else if (text.includes("reduce") || text.includes("lower") || text.includes("adjust") || 
             text.includes("decrease") || text.includes("consider") && (text.includes("dose") || text.includes("alternative"))) {
    risk_label = "Adjust Dosage";
    // Determine severity based on percentage mentioned or classification
    if (text.includes("50%") || text.includes("50-70%")) {
      severity = "high";
    } else if (text.includes("25%") || text.includes("25-50%")) {
      severity = "moderate";
    } else if (rec.classification === "Strong") {
      severity = "moderate";
    } else {
      severity = "low";
    }
  } else if (text.includes("standard") || text.includes("label recommended") || text.includes("per standard")) {
    risk_label = "Safe";
    severity = "none";
  } else if (text.includes("no recommendation")) {
    risk_label = "Unknown";
    severity = "none";
  } else {
    // Default: Try to infer from phenotype
    if (phenotype === "NM" || phenotype === "RM") {
      risk_label = "Safe";
      severity = "none";
    } else if (phenotype === "PM" || phenotype === "IM") {
      risk_label = "Adjust Dosage";
      severity = "moderate";
    } else if (phenotype === "URM") {
      risk_label = "Adjust Dosage";
      severity = "moderate";
    } else {
      risk_label = "Unknown";
      severity = "none";
    }
  }
  
  return {
    risk_label,
    severity,
    action: rec.drugrecommendation,
    implications,
    alternatives: rec.alternatedrugavailable ? undefined : undefined, // API doesn't provide specific alternatives
    classification: rec.classification,
    activityScore: rec.activityscore[gene],
  };
}

// ─── Fetch with Timeout ───────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Fetch gene-drug pairs from CPIC API
 */
export async function fetchPairs(): Promise<Map<string, CPICPair[]> | null> {
  // Check cache
  if (cache.pairs && Date.now() - cache.pairs.timestamp < CACHE_TTL_MS) {
    return cache.pairs.data;
  }
  
  try {
    const response = await fetchWithTimeout(`${CPIC_API_BASE}/pair`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const pairs: CPICPair[] = await response.json();
    const pairMap = new Map<string, CPICPair[]>();
    
    for (const pair of pairs) {
      const drugId = pair.drugid;
      if (!pairMap.has(drugId)) {
        pairMap.set(drugId, []);
      }
      pairMap.get(drugId)!.push(pair);
    }
    
    cache.pairs = { data: pairMap, timestamp: Date.now() };
    return pairMap;
  } catch (error) {
    console.error("[CPIC API] Failed to fetch pairs:", error);
    return null;
  }
}

/**
 * Fetch recommendations for a specific drug by RxNorm ID
 */
export async function fetchRecommendations(drugId: string): Promise<CPICRecommendation[] | null> {
  // Check cache
  const cached = cache.recommendations.get(drugId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  
  try {
    const url = `${CPIC_API_BASE}/recommendation?drugid=eq.${encodeURIComponent(drugId)}`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const recommendations: CPICRecommendation[] = await response.json();
    cache.recommendations.set(drugId, { data: recommendations, timestamp: Date.now() });
    return recommendations;
  } catch (error) {
    console.error(`[CPIC API] Failed to fetch recommendations for ${drugId}:`, error);
    return null;
  }
}

/**
 * Fetch diplotype → phenotype mappings for a gene
 * Note: Only fetches specific diplotypes to avoid massive data transfer
 */
export async function fetchDiplotypePhenotype(
  gene: SupportedGene, 
  diplotype: string
): Promise<string | null> {
  // Check cache
  const cacheKey = gene;
  const cached = cache.diplotypes.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    const result = cached.data.get(diplotype);
    if (result) return result;
  }
  
  try {
    // Query specific diplotype
    const url = `${CPIC_API_BASE}/diplotype?genesymbol=eq.${gene}&diplotype=eq.${encodeURIComponent(diplotype)}`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const diplotypes: CPICDiplotype[] = await response.json();
    if (diplotypes.length === 0) return null;
    
    const phenotype = diplotypes[0].generesult;
    
    // Update cache
    if (!cached) {
      cache.diplotypes.set(cacheKey, { data: new Map(), timestamp: Date.now() });
    }
    cache.diplotypes.get(cacheKey)!.data.set(diplotype, phenotype);
    
    return phenotype;
  } catch (error) {
    console.error(`[CPIC API] Failed to fetch diplotype ${diplotype} for ${gene}:`, error);
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get gene associated with a drug from CPIC API
 */
export async function getGeneForDrug(drug: SupportedDrug): Promise<SupportedGene | null> {
  const drugId = DRUG_RXNORM_IDS[drug];
  const pairs = await fetchPairs();
  
  if (!pairs) return null;
  
  const drugPairs = pairs.get(drugId);
  if (!drugPairs || drugPairs.length === 0) return null;
  
  // Find the pair used for recommendations
  const recPair = drugPairs.find(p => p.usedforrecommendation);
  if (recPair) {
    return recPair.genesymbol as SupportedGene;
  }
  
  // Fall back to first pair
  return drugPairs[0].genesymbol as SupportedGene;
}

/**
 * Get CPIC level for a drug-gene pair (A, B, C, D)
 */
export async function getCPICLevel(drug: SupportedDrug): Promise<string | null> {
  const drugId = DRUG_RXNORM_IDS[drug];
  const pairs = await fetchPairs();
  
  if (!pairs) return null;
  
  const drugPairs = pairs.get(drugId);
  if (!drugPairs || drugPairs.length === 0) return null;
  
  const recPair = drugPairs.find(p => p.usedforrecommendation);
  return recPair?.cpiclevel || drugPairs[0]?.cpiclevel || null;
}

/**
 * Get phenotype from diplotype using CPIC API
 * Returns null if not found (caller should fall back to hardcoded)
 */
export async function getPhenotypeFromAPI(
  gene: SupportedGene, 
  diplotype: string
): Promise<Phenotype | null> {
  const phenotypeName = await fetchDiplotypePhenotype(gene, diplotype);
  if (!phenotypeName) return null;
  
  return PHENOTYPE_MAP[phenotypeName] || null;
}

/**
 * Get risk entry for a drug + phenotype combination from CPIC API
 */
export async function getRiskFromAPI(
  drug: SupportedDrug, 
  phenotype: Phenotype,
  gene: SupportedGene
): Promise<APIRiskEntry | null> {
  const drugId = DRUG_RXNORM_IDS[drug];
  const recommendations = await fetchRecommendations(drugId);
  
  if (!recommendations || recommendations.length === 0) return null;
  
  // Find recommendation matching our phenotype
  const phenotypeName = getPhenotypeName(phenotype);
  const matching = recommendations.find(rec => {
    const recPhenotype = rec.phenotypes[gene];
    return recPhenotype && recPhenotype.toLowerCase().includes(phenotypeName.toLowerCase());
  });
  
  if (!matching) {
    // Try to find by activity score for NM/IM edge cases
    // NM typically has activity score around 1.25-2.25
    // PM has activity score 0.0
    // IM has activity score 0.25-1.0
    const activityScoreRanges: Record<Phenotype, [number, number]> = {
      PM:      [0, 0],
      IM:      [0.25, 1.0],
      NM:      [1.25, 2.25],
      RM:      [2.5, 3.0],   // Some RM thresholds
      URM:     [2.5, 10],    // URM is ≥2.5 for most genes
      Unknown: [-1, -1],
    };
    
    const [minScore, maxScore] = activityScoreRanges[phenotype];
    const scoreMatch = recommendations.find(rec => {
      const score = parseFloat(rec.activityscore[gene] || "");
      return !isNaN(score) && score >= minScore && score <= maxScore;
    });
    
    if (scoreMatch) {
      return deriveRiskFromRecommendation(scoreMatch, gene);
    }
    
    return null;
  }
  
  return deriveRiskFromRecommendation(matching, gene);
}

/**
 * Get guideline citations for a drug
 */
export async function getGuidelineCitations(drug: SupportedDrug): Promise<string[] | null> {
  const drugId = DRUG_RXNORM_IDS[drug];
  const pairs = await fetchPairs();
  
  if (!pairs) return null;
  
  const drugPairs = pairs.get(drugId);
  if (!drugPairs || drugPairs.length === 0) return null;
  
  const recPair = drugPairs.find(p => p.usedforrecommendation);
  return recPair?.citations || drugPairs[0]?.citations || null;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getPhenotypeName(phenotype: Phenotype): string {
  const reverseMap: Record<Phenotype, string> = {
    PM:      "Poor Metabolizer",
    IM:      "Intermediate Metabolizer",
    NM:      "Normal Metabolizer",
    RM:      "Rapid Metabolizer",
    URM:     "Ultrarapid Metabolizer",
    Unknown: "Indeterminate",
  };
  return reverseMap[phenotype];
}

// ─── Cache Management ─────────────────────────────────────────────────────────

/**
 * Pre-warm cache with all supported drugs
 * Call this on server startup or first request to reduce latency
 */
export async function warmCache(): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  // Fetch pairs (gene-drug associations)
  const pairs = await fetchPairs();
  if (!pairs) {
    errors.push("Failed to fetch gene-drug pairs");
  }
  
  // Fetch recommendations for all supported drugs in parallel
  const drugIds = Object.values(DRUG_RXNORM_IDS);
  const results = await Promise.allSettled(
    drugIds.map(id => fetchRecommendations(id))
  );
  
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      errors.push(`Failed to fetch recommendations for ${Object.keys(DRUG_RXNORM_IDS)[index]}`);
    }
  });
  
  return { success: errors.length === 0, errors };
}

/**
 * Clear all cached data
 */
export function clearCache(): void {
  cache.drugs = null;
  cache.pairs = null;
  cache.recommendations.clear();
  cache.diplotypes.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  hasPairs: boolean;
  recommendationsCached: number;
  diplotypesCached: number;
  oldestEntry: number | null;
} {
  const timestamps: number[] = [];
  
  if (cache.pairs) timestamps.push(cache.pairs.timestamp);
  cache.recommendations.forEach(entry => timestamps.push(entry.timestamp));
  cache.diplotypes.forEach(entry => timestamps.push(entry.timestamp));
  
  return {
    hasPairs: cache.pairs !== null,
    recommendationsCached: cache.recommendations.size,
    diplotypesCached: cache.diplotypes.size,
    oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
  };
}

/**
 * Check if CPIC API is reachable
 */
export async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${CPIC_API_BASE}/drug?limit=1`, 3000);
    return response.ok;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Dynamic Drug Catalog
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Drug entry with gene association from CPIC API
 */
export interface CPICDrugEntry {
  drugId: string;
  name: string;            // lowercase drug name
  displayName: string;     // Title case for display
  gene: string;            // Primary gene for this drug
  cpicLevel: string;       // A, B, C, D
  hasGuideline: boolean;
  category?: string;       // Inferred from gene/drug
}

// Drug category inference based on gene or drug name patterns
function inferCategory(drugName: string, gene: string): string {
  const name = drugName.toLowerCase();
  
  // Gene-based categories
  if (gene === "DPYD") return "Oncology";
  if (gene === "TPMT" || gene === "NUDT15") return "Immuno";
  if (gene === "HLA-B" || gene === "HLA-A") return "Immuno";
  if (gene === "G6PD") return "Other";
  if (gene === "RYR1" || gene === "CACNA1S") return "Anesthesia";
  if (gene === "MT-RNR1") return "Antibiotics";
  
  // Drug name-based categories
  if (["codeine", "tramadol", "morphine", "oxycodone", "hydrocodone", "fentanyl", 
       "buprenorphine", "alfentanil", "methadone"].some(d => name.includes(d))) {
    return "Pain";
  }
  if (["warfarin", "clopidogrel", "prasugrel", "ticagrelor"].some(d => name.includes(d))) {
    return "Cardio";
  }
  if (["statin", "simvastatin", "atorvastatin", "rosuvastatin", "pravastatin", "lovastatin", "fluvastatin"].some(d => name.includes(d))) {
    return "Cardio";
  }
  if (["omeprazole", "esomeprazole", "lansoprazole", "pantoprazole", "rabeprazole", "dexlansoprazole"].some(d => name.includes(d))) {
    return "GI";
  }
  if (["celecoxib", "diclofenac", "ibuprofen", "naproxen", "piroxicam", "meloxicam", "aspirin"].some(d => name.includes(d))) {
    return "Pain";
  }
  if (["amitriptyline", "nortriptyline", "desipramine", "imipramine", "clomipramine", "doxepin", 
       "citalopram", "escitalopram", "sertraline", "paroxetine", "fluoxetine", "venlafaxine", "desvenlafaxine"].some(d => name.includes(d))) {
    return "Psychiatry";
  }
  if (["carbamazepine", "phenytoin", "oxcarbazepine", "lamotrigine"].some(d => name.includes(d))) {
    return "Neurology";
  }
  if (["fluorouracil", "capecitabine", "mercaptopurine", "thioguanine", "doxorubicin", 
       "irinotecan", "tamoxifen", "dabrafenib"].some(d => name.includes(d))) {
    return "Oncology";
  }
  if (["azathioprine", "tacrolimus", "cyclosporine", "mycophenolate"].some(d => name.includes(d))) {
    return "Immuno";
  }
  if (["abacavir", "atazanavir", "efavirenz", "nevirapine"].some(d => name.includes(d))) {
    return "Infectious";
  }
  if (["allopurinol", "rasburicase"].some(d => name.includes(d))) {
    return "Rheumatology";
  }
  if (["atomoxetine", "methylphenidate"].some(d => name.includes(d))) {
    return "Psychiatry";
  }
  
  return "Other";
}

// Title case helper
function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

// Cache for full drug catalog
let drugCatalogCache: CacheEntry<CPICDrugEntry[]> | null = null;

/**
 * Fetch ALL drugs from CPIC that have guidelines
 * Returns structured list with gene associations
 */
export async function fetchAllDrugs(): Promise<CPICDrugEntry[]> {
  // Check cache
  if (drugCatalogCache && Date.now() - drugCatalogCache.timestamp < CACHE_TTL_MS) {
    return drugCatalogCache.data;
  }
  
  try {
    // Fetch drugs with guidelines
    const drugsResponse = await fetchWithTimeout(
      `${CPIC_API_BASE}/drug?guidelineid=not.is.null`
    );
    if (!drugsResponse.ok) throw new Error(`HTTP ${drugsResponse.status}`);
    const drugs: CPICDrug[] = await drugsResponse.json();
    
    // Fetch pairs to get gene associations
    const pairs = await fetchPairs();
    
    // Build drug entries with gene associations
    const entries: CPICDrugEntry[] = [];
    
    for (const drug of drugs) {
      // Find the gene associated with this drug
      const drugPairs = pairs?.get(drug.drugid) || [];
      const recPair = drugPairs.find(p => p.usedforrecommendation) || drugPairs[0];
      
      if (!recPair) continue; // Skip drugs without gene associations
      
      entries.push({
        drugId: drug.drugid,
        name: drug.name.toLowerCase(),
        displayName: toTitleCase(drug.name),
        gene: recPair.genesymbol,
        cpicLevel: recPair.cpiclevel || "N/A",
        hasGuideline: drug.guidelineid !== null,
        category: inferCategory(drug.name, recPair.genesymbol),
      });
    }
    
    // Sort by name
    entries.sort((a, b) => a.name.localeCompare(b.name));
    
    // Cache result
    drugCatalogCache = { data: entries, timestamp: Date.now() };
    
    return entries;
  } catch (error) {
    console.error("[CPIC API] Failed to fetch drug catalog:", error);
    // Return empty array on failure - fallback to hardcoded in the component
    return [];
  }
}

/**
 * Get drug ID by name (case-insensitive)
 */
export async function getDrugIdByName(drugName: string): Promise<string | null> {
  const drugs = await fetchAllDrugs();
  const drug = drugs.find(d => d.name === drugName.toLowerCase());
  return drug?.drugId || null;
}

/**
 * Get gene for any drug by name (case-insensitive)
 * Works for both hardcoded and dynamic drugs
 */
export async function getGeneByDrugName(drugName: string): Promise<string | null> {
  const drugs = await fetchAllDrugs();
  const drug = drugs.find(d => d.name === drugName.toLowerCase());
  return drug?.gene || null;
}

/**
 * Get risk from API for any drug (not just hardcoded ones)
 */
export async function getRiskForAnyDrug(
  drugName: string,
  phenotype: Phenotype,
  gene: string
): Promise<APIRiskEntry | null> {
  // Get drug ID
  const drugId = await getDrugIdByName(drugName);
  if (!drugId) return null;
  
  // Fetch recommendations
  const recommendations = await fetchRecommendations(drugId);
  if (!recommendations || recommendations.length === 0) return null;
  
  // Find recommendation matching our phenotype
  const phenotypeName = getPhenotypeName(phenotype);
  const matching = recommendations.find(rec => {
    const recPhenotype = rec.phenotypes[gene];
    return recPhenotype && recPhenotype.toLowerCase().includes(phenotypeName.toLowerCase());
  });
  
  if (!matching) {
    // Try by activity score
    const activityScoreRanges: Record<Phenotype, [number, number]> = {
      PM:      [0, 0],
      IM:      [0.25, 1.0],
      NM:      [1.25, 2.25],
      RM:      [2.5, 3.0],
      URM:     [2.5, 10],
      Unknown: [-1, -1],
    };
    
    const [minScore, maxScore] = activityScoreRanges[phenotype];
    const scoreMatch = recommendations.find(rec => {
      const score = parseFloat(rec.activityscore[gene] || "");
      return !isNaN(score) && score >= minScore && score <= maxScore;
    });
    
    if (scoreMatch) {
      return deriveRiskFromRecommendation(scoreMatch, gene as any);
    }
    
    return null;
  }
  
  return deriveRiskFromRecommendation(matching, gene as any);
}
