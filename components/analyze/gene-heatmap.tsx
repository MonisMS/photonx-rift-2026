"use client";

import { ShieldCheck } from "lucide-react";
import type { VCFVariant, SupportedGene } from "@/lib/types";
import { buildDiplotype, getPhenotype } from "@/lib/cpic";

const ALL_GENES: SupportedGene[] = ["CYP2D6", "CYP2C19", "CYP2C9", "SLCO1B1", "TPMT", "DPYD"];

const PHENOTYPE_HEAT: Record<string, string> = {
  PM:      "bg-red-100 text-red-700 border-red-200",
  IM:      "bg-amber-100 text-amber-700 border-amber-200",
  NM:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  RM:      "bg-blue-100 text-blue-700 border-blue-200",
  URM:     "bg-violet-100 text-violet-700 border-violet-200",
  Unknown: "bg-muted text-muted-foreground border-border",
};

const PHENOTYPE_FULL: Record<string, string> = {
  PM: "Poor Metabolizer",
  IM: "Intermediate",
  NM: "Normal",
  RM: "Rapid",
  URM: "Ultrarapid",
  Unknown: "—",
};

export function GeneHeatmap({ variants }: { variants: VCFVariant[] }) {
  const foundGenes = new Set(variants.map((v) => v.gene));
  const coverage = foundGenes.size;
  const completeness = coverage >= 5 ? "High" : coverage >= 3 ? "Moderate" : "Low";
  const compColor =
    coverage >= 5
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : coverage >= 3
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-orange-700 bg-orange-50 border-orange-200";
  const actionableCount = variants.filter((v) => v.starAllele !== "*1").length;

  return (
    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 space-y-3">
      {/* Summary line */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="flex items-center gap-1.5 text-xs text-emerald-800">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="font-bold">{coverage}/{ALL_GENES.length} genes</span>
          <span className="text-emerald-700 font-normal">
            · {variants.length} variant{variants.length > 1 ? "s" : ""}
            {actionableCount > 0 ? ` · ${actionableCount} actionable` : ""}
          </span>
        </p>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${compColor}`}>
          {completeness}
        </span>
      </div>

      {/* Gene phenotype heatmap */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {ALL_GENES.map((g) => {
          const found = foundGenes.has(g);
          const diplotype = found ? (buildDiplotype(variants, g) ?? "*1/*1") : null;
          const phenotype = diplotype ? getPhenotype(g, diplotype) : "Unknown";
          const heat = found
            ? PHENOTYPE_HEAT[phenotype]
            : "bg-muted/50 text-muted-foreground/30 border-border";
          return (
            <div key={g} className={`rounded-md border px-2 py-1.5 text-center ${heat} ${!found ? "opacity-40" : ""}`}>
              <p className="text-[10px] font-mono font-bold leading-none">{g}</p>
              {found && diplotype ? (
                <>
                  <p className="text-[9px] font-mono mt-1 opacity-70">{diplotype}</p>
                  <p className="text-[10px] font-bold mt-0.5">{PHENOTYPE_FULL[phenotype]}</p>
                </>
              ) : (
                <p className="text-[9px] mt-1">No data</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
