"use client";

import { motion } from "framer-motion";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge }    from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn }        from "@/lib/utils";
import type { AnalysisResult, RiskLabel, Phenotype } from "@/lib/types";
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, HelpCircle, Sparkles } from "lucide-react";

// ─── Risk visual system ───────────────────────────────────────────────────────

interface RiskStyle {
  headerBg:    string;
  headerText:  string;
  borderColor: string;
  badgeBg:     string;
  badgeText:   string;
  icon:        React.FC<{ className?: string }>;
}

const RISK_STYLES: Record<RiskLabel, RiskStyle> = {
  "Safe": {
    headerBg:    "bg-emerald-50",
    headerText:  "text-emerald-800",
    borderColor: "border-emerald-200",
    badgeBg:     "bg-emerald-100",
    badgeText:   "text-emerald-800",
    icon:        CheckCircle2,
  },
  "Adjust Dosage": {
    headerBg:    "bg-amber-50",
    headerText:  "text-amber-800",
    borderColor: "border-amber-200",
    badgeBg:     "bg-amber-100",
    badgeText:   "text-amber-800",
    icon:        AlertTriangle,
  },
  "Toxic": {
    headerBg:    "bg-red-50",
    headerText:  "text-red-800",
    borderColor: "border-red-200",
    badgeBg:     "bg-red-100",
    badgeText:   "text-red-800",
    icon:        XCircle,
  },
  "Ineffective": {
    headerBg:    "bg-orange-50",
    headerText:  "text-orange-800",
    borderColor: "border-orange-200",
    badgeBg:     "bg-orange-100",
    badgeText:   "text-orange-800",
    icon:        MinusCircle,
  },
  "Unknown": {
    headerBg:    "bg-muted/40",
    headerText:  "text-muted-foreground",
    borderColor: "border-border",
    badgeBg:     "bg-muted",
    badgeText:   "text-muted-foreground",
    icon:        HelpCircle,
  },
};

// ─── Phenotype system ─────────────────────────────────────────────────────────

const PHENOTYPE_COLORS: Record<Phenotype, string> = {
  PM:      "bg-red-100    text-red-700",
  IM:      "bg-amber-100  text-amber-700",
  NM:      "bg-emerald-100 text-emerald-700",
  RM:      "bg-blue-100   text-blue-700",
  URM:     "bg-violet-100 text-violet-700",
  Unknown: "bg-muted      text-muted-foreground",
};

const PHENOTYPE_LABEL: Record<Phenotype, string> = {
  PM:      "Poor Metabolizer",
  IM:      "Intermediate Metabolizer",
  NM:      "Normal Metabolizer",
  RM:      "Rapid Metabolizer",
  URM:     "Ultrarapid Metabolizer",
  Unknown: "Unknown",
};

// ─── Confidence bar colour ────────────────────────────────────────────────────

function confidenceColor(score: number): string {
  if (score >= 0.9) return "bg-emerald-500";
  if (score >= 0.6) return "bg-amber-500";
  return "bg-orange-400";
}

// ─── Props ────────────────────────────────────────────────────────────────────

type PartialResult = Omit<AnalysisResult, "llm_generated_explanation"> & {
  llm_generated_explanation?: AnalysisResult["llm_generated_explanation"];
};

interface ResultCardProps {
  result:            PartialResult;
  isLoadingExplain?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResultCard({ result, isLoadingExplain = false }: ResultCardProps) {
  const { risk_assessment, pharmacogenomic_profile, clinical_recommendation, llm_generated_explanation } = result;
  const risk       = risk_assessment.risk_label;
  const phenotype  = pharmacogenomic_profile.phenotype;
  const style      = RISK_STYLES[risk];
  const RiskIcon   = style.icon;
  const confidence = risk_assessment.confidence_score;

  return (
    <Card className={cn(
      "overflow-hidden shadow-card transition-shadow hover:shadow-card-md border",
      style.borderColor
    )}>

      {/* ── Coloured header strip ── */}
      <div className={cn(
        "flex items-center justify-between px-5 py-3.5 border-b",
        style.headerBg,
        style.borderColor.replace("border-", "border-b-")
      )}>
        <div className="flex items-center gap-2.5">
          <RiskIcon className={cn("h-4 w-4", style.headerText)} />
          <span className={cn("font-bold text-sm tracking-wide", style.headerText)}>
            {result.drug}
          </span>
        </div>
        <span className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
          style.badgeBg,
          style.badgeText,
          style.borderColor
        )}>
          {risk}
        </span>
      </div>

      <CardContent className="p-5 space-y-4">

        {/* ── Gene profile row ── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm">
            <span className="text-muted-foreground text-xs">Gene </span>
            <span className="font-mono font-semibold text-xs">{pharmacogenomic_profile.primary_gene}</span>
          </div>
          <Separator orientation="vertical" className="h-3.5" />
          <div className="text-sm">
            <span className="text-muted-foreground text-xs">Diplotype </span>
            <span className="font-mono font-semibold text-xs">{pharmacogenomic_profile.diplotype}</span>
          </div>
          <Separator orientation="vertical" className="h-3.5" />
          <span className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
            PHENOTYPE_COLORS[phenotype]
          )}>
            {phenotype} — {PHENOTYPE_LABEL[phenotype]}
          </span>
        </div>

        {/* ── Detected variants ── */}
        {pharmacogenomic_profile.detected_variants.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pharmacogenomic_profile.detected_variants.map((v) => (
              <span
                key={v.rsid}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {v.rsid}
                <span className="text-muted-foreground/50">·</span>
                {v.star_allele}
              </span>
            ))}
          </div>
        )}

        {/* ── Confidence bar ── */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="group relative cursor-help">
              Prediction confidence
              <span className="pointer-events-none absolute bottom-full left-0 mb-2 w-56 rounded-lg border border-border bg-card p-2.5 text-[11px] leading-relaxed shadow-card-md opacity-0 transition-opacity group-hover:opacity-100 z-50">
                {confidence >= 0.9
                  ? "Both alleles detected in VCF → high confidence."
                  : confidence >= 0.6
                  ? "Only one allele detected — assumes normal (*1) for the missing copy."
                  : "No alleles found for this gene — prediction based on default (*1/*1) diplotype."}
              </span>
            </span>
            <span className="font-medium tabular-nums">
              {Math.round(confidence * 100)}%
            </span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className={cn("h-full rounded-full", confidenceColor(confidence))}
              initial={{ width: 0 }}
              animate={{ width: `${confidence * 100}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            />
          </div>
        </div>

        <Separator />

        {/* ── Clinical recommendation ── */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {clinical_recommendation.action}
        </p>

        {/* ── Alternatives ── */}
        {clinical_recommendation.alternative_drugs && clinical_recommendation.alternative_drugs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">Alternatives:</span>
            {clinical_recommendation.alternative_drugs.map((d) => (
              <Badge
                key={d}
                variant="secondary"
                className="text-[11px] px-2 py-0.5 font-medium"
              >
                {d}
              </Badge>
            ))}
          </div>
        )}

        {/* ── CPIC Guideline Reference ── */}
        {"guideline_reference" in clinical_recommendation && clinical_recommendation.guideline_reference && (
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed font-mono">
            {clinical_recommendation.guideline_reference}
          </p>
        )}

        {/* ── AI Explanation ── */}
        {isLoadingExplain ? (
          <div className="space-y-2 pt-1 rounded-lg bg-muted/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-32" />
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="h-3.5 w-4/6" />
          </div>
        ) : llm_generated_explanation ? (
          <Accordion type="single" collapsible>
            <AccordionItem value="explanation" className="border-0">
              <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline group">
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </span>
                  AI Clinical Explanation
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-4 text-sm">
                  <p className="text-muted-foreground leading-relaxed">
                    {llm_generated_explanation.summary}
                  </p>
                  <div>
                    <p className="font-semibold text-foreground mb-1.5 text-xs uppercase tracking-wide">
                      Mechanism
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      {llm_generated_explanation.mechanism}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1.5 text-xs uppercase tracking-wide">
                      Clinical Recommendation
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      {llm_generated_explanation.recommendation}
                    </p>
                  </div>
                  {llm_generated_explanation.citations && (
                    <div className="border-t border-border pt-3">
                      <p className="font-semibold text-foreground mb-1.5 text-xs uppercase tracking-wide">
                        Citations
                      </p>
                      <p className="text-muted-foreground text-xs leading-relaxed font-mono">
                        {llm_generated_explanation.citations}
                      </p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}

      </CardContent>
    </Card>
  );
}
