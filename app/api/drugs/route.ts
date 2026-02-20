/**
 * CPIC Drug Catalog API
 * 
 * GET /api/drugs → Returns CPIC drugs for our 6 supported genes only
 * 
 * IMPORTANT: Only returns drugs that map to our declared gene panel:
 * CYP2D6, CYP2C19, CYP2C9, SLCO1B1, TPMT, DPYD
 * 
 * Response includes:
 * - drugId: CPIC/RxNorm identifier
 * - name: lowercase drug name
 * - displayName: Title case for UI
 * - gene: Primary gene for this drug
 * - cpicLevel: Evidence level (A, B, C, D)
 * - category: Drug category for UI grouping
 */

import { NextResponse } from "next/server";
import { fetchAllDrugs, type CPICDrugEntry } from "@/lib/cpic-api";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour at edge

// The 6 genes declared in problem statement - ONLY show drugs for these
const SUPPORTED_GENES = new Set(["CYP2D6", "CYP2C19", "CYP2C9", "SLCO1B1", "TPMT", "DPYD"]);

// Hardcoded fallback if API is down
const FALLBACK_DRUGS: CPICDrugEntry[] = [
  { drugId: "RxNorm:2670", name: "codeine", displayName: "Codeine", gene: "CYP2D6", cpicLevel: "A", hasGuideline: true, category: "Pain" },
  { drugId: "RxNorm:10689", name: "tramadol", displayName: "Tramadol", gene: "CYP2D6", cpicLevel: "A", hasGuideline: true, category: "Pain" },
  { drugId: "RxNorm:11289", name: "warfarin", displayName: "Warfarin", gene: "CYP2C9", cpicLevel: "A", hasGuideline: true, category: "Cardio" },
  { drugId: "RxNorm:32968", name: "clopidogrel", displayName: "Clopidogrel", gene: "CYP2C19", cpicLevel: "A", hasGuideline: true, category: "Cardio" },
  { drugId: "RxNorm:7646", name: "omeprazole", displayName: "Omeprazole", gene: "CYP2C19", cpicLevel: "A", hasGuideline: true, category: "GI" },
  { drugId: "RxNorm:36567", name: "simvastatin", displayName: "Simvastatin", gene: "SLCO1B1", cpicLevel: "A", hasGuideline: true, category: "Cardio" },
  { drugId: "RxNorm:140587", name: "celecoxib", displayName: "Celecoxib", gene: "CYP2C9", cpicLevel: "A", hasGuideline: true, category: "Pain" },
  { drugId: "RxNorm:1256", name: "azathioprine", displayName: "Azathioprine", gene: "TPMT", cpicLevel: "A", hasGuideline: true, category: "Immuno" },
  { drugId: "RxNorm:4492", name: "fluorouracil", displayName: "Fluorouracil", gene: "DPYD", cpicLevel: "A", hasGuideline: true, category: "Oncology" },
  { drugId: "RxNorm:194000", name: "capecitabine", displayName: "Capecitabine", gene: "DPYD", cpicLevel: "A", hasGuideline: true, category: "Oncology" },
];

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Try to fetch from CPIC API
    const allDrugs = await fetchAllDrugs();
    
    if (allDrugs.length === 0) {
      // API failed, use fallback
      return NextResponse.json({
        drugs: FALLBACK_DRUGS,
        source: "fallback",
        count: FALLBACK_DRUGS.length,
        latency: Date.now() - startTime,
      });
    }
    
    // CRITICAL: Filter to only include drugs for our 6 supported genes
    const filteredDrugs = allDrugs.filter(drug => SUPPORTED_GENES.has(drug.gene));
    
    return NextResponse.json({
      drugs: filteredDrugs,
      source: "api",
      count: filteredDrugs.length,
      totalInAPI: allDrugs.length,
      latency: Date.now() - startTime,
    });
  } catch (error) {
    // Return fallback on error
    return NextResponse.json({
      drugs: FALLBACK_DRUGS,
      source: "fallback",
      count: FALLBACK_DRUGS.length,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
