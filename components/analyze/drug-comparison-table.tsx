"use client";

import type { AnalysisResult } from "@/lib/types";

type CPICResult = Omit<AnalysisResult, "llm_generated_explanation">;

const RISK_COLORS: Record<string, string> = {
  "Safe":          "text-emerald-700 bg-emerald-50",
  "Adjust Dosage": "text-amber-700 bg-amber-50",
  "Toxic":         "text-red-700 bg-red-50",
  "Ineffective":   "text-orange-700 bg-orange-50",
  "Unknown":       "text-muted-foreground bg-muted",
};

export function DrugComparisonTable({ cpicResults }: { cpicResults: CPICResult[] }) {
  if (cpicResults.length <= 1) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Drug</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Gene</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Diplotype</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Phenotype</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Risk</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {cpicResults.map((r) => (
            <tr key={r.drug} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2 font-semibold text-foreground">{r.drug}</td>
              <td className="px-3 py-2 font-mono text-muted-foreground">{r.pharmacogenomic_profile.primary_gene}</td>
              <td className="px-3 py-2 font-mono">{r.pharmacogenomic_profile.diplotype}</td>
              <td className="px-3 py-2">{r.pharmacogenomic_profile.phenotype}</td>
              <td className="px-3 py-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${RISK_COLORS[r.risk_assessment.risk_label] ?? ""}`}>
                  {r.risk_assessment.risk_label}
                </span>
              </td>
              <td className="px-3 py-2 font-medium tabular-nums">
                {Math.round(r.risk_assessment.confidence_score * 100)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
