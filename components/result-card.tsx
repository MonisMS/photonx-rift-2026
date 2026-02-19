"use client";

import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge }     from "@/components/ui/badge";
import { Progress }  from "@/components/ui/progress";
import { Skeleton }  from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { cn }        from "@/lib/utils";
import type { AnalysisResult, RiskLabel, Phenotype } from "@/lib/types";

// ─── Colour Maps ──────────────────────────────────────────────────────────────

const RISK_COLORS: Record<RiskLabel, string> = {
  "Safe":          "bg-green-100  text-green-800  border-green-300",
  "Adjust Dosage": "bg-amber-100  text-amber-800  border-amber-300",
  "Toxic":         "bg-red-100    text-red-800    border-red-400",
  "Ineffective":   "bg-orange-100 text-orange-800 border-orange-300",
  "Unknown":       "bg-gray-100   text-gray-600   border-gray-300",
};

const RISK_ICONS: Record<RiskLabel, string> = {
  "Safe": "✓", "Adjust Dosage": "⚠", "Toxic": "✕", "Ineffective": "⊘", "Unknown": "?",
};

const PHENOTYPE_COLORS: Record<Phenotype, string> = {
  PM:      "bg-red-100    text-red-700",
  IM:      "bg-amber-100  text-amber-700",
  NM:      "bg-green-100  text-green-700",
  RM:      "bg-blue-100   text-blue-700",
  URM:     "bg-purple-100 text-purple-700",
  Unknown: "bg-gray-100   text-gray-600",
};

// ─── Props ────────────────────────────────────────────────────────────────────

type PartialResult = Omit<AnalysisResult, "llm_generated_explanation"> & {
  llm_generated_explanation?: AnalysisResult["llm_generated_explanation"];
};

interface ResultCardProps {
  result:             PartialResult;
  isLoadingExplain?:  boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResultCard({ result, isLoadingExplain = false }: ResultCardProps) {
  const { risk_assessment, pharmacogenomic_profile, clinical_recommendation, llm_generated_explanation } = result;
  const risk      = risk_assessment.risk_label;
  const phenotype = pharmacogenomic_profile.phenotype;

  return (
    <Card className="overflow-hidden">
      {/* ── Header strip ── */}
      <div className={cn("px-5 py-3 border-b flex items-center justify-between", RISK_COLORS[risk])}>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{RISK_ICONS[risk]}</span>
          <span className="font-bold tracking-wide">{result.drug}</span>
        </div>
        <Badge variant="outline" className={cn("font-semibold border", RISK_COLORS[risk])}>
          {risk}
        </Badge>
      </div>

      <CardContent className="p-5 space-y-4">

        {/* ── Gene Profile ── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Gene </span>
            <span className="font-mono font-semibold">{pharmacogenomic_profile.primary_gene}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="text-sm">
            <span className="text-muted-foreground">Diplotype </span>
            <span className="font-mono font-semibold">{pharmacogenomic_profile.diplotype}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <Badge className={cn("text-xs font-semibold", PHENOTYPE_COLORS[phenotype])}>
            {phenotype} — {PHENOTYPE_LABEL[phenotype]}
          </Badge>
        </div>

        {/* ── Detected Variants ── */}
        {pharmacogenomic_profile.detected_variants.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pharmacogenomic_profile.detected_variants.map((v) => (
              <span
                key={v.rsid}
                className="inline-block rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
              >
                {v.rsid} · {v.star_allele}
              </span>
            ))}
          </div>
        )}

        {/* ── Confidence ── */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Confidence</span>
            <span>{Math.round(risk_assessment.confidence_score * 100)}%</span>
          </div>
          <Progress value={risk_assessment.confidence_score * 100} className="h-1.5" />
        </div>

        <Separator />

        {/* ── Clinical Recommendation ── */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {clinical_recommendation.action}
        </p>

        {clinical_recommendation.alternative_drugs && clinical_recommendation.alternative_drugs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground mr-1">Alternatives:</span>
            {clinical_recommendation.alternative_drugs.map((d) => (
              <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
            ))}
          </div>
        )}

        {/* ── Gemini Explanation ── */}
        {isLoadingExplain ? (
          <div className="space-y-2 pt-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : llm_generated_explanation ? (
          <Accordion type="single" collapsible>
            <AccordionItem value="explanation" className="border-0">
              <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
                AI Clinical Explanation
              </AccordionTrigger>
              <AccordionContent className="text-sm space-y-3 text-muted-foreground">
                <p>{llm_generated_explanation.summary}</p>
                <div>
                  <p className="font-medium text-foreground mb-1">Mechanism</p>
                  <p>{llm_generated_explanation.mechanism}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">Recommendation</p>
                  <p>{llm_generated_explanation.recommendation}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}

      </CardContent>
    </Card>
  );
}

// ─── Phenotype Labels ─────────────────────────────────────────────────────────

const PHENOTYPE_LABEL: Record<Phenotype, string> = {
  PM:      "Poor Metabolizer",
  IM:      "Intermediate Metabolizer",
  NM:      "Normal Metabolizer",
  RM:      "Rapid Metabolizer",
  URM:     "Ultrarapid Metabolizer",
  Unknown: "Unknown",
};
