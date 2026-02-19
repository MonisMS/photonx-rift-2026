"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button }    from "@/components/ui/button";
import { Skeleton }  from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ResultCard } from "@/components/result-card";
import { ResultSkeleton }       from "./result-skeleton";
import { DrugComparisonTable }  from "./drug-comparison-table";
import type { AnalysisResult } from "@/lib/types";
import {
  Download,
  Copy,
  CheckCheck,
  FlaskConical,
  Loader2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Clock,
  Dna,
  Sparkles,
  Info,
} from "lucide-react";

type Phase = "idle" | "analyzing" | "explaining" | "done" | "error";
type CPICResult = Omit<AnalysisResult, "llm_generated_explanation">;

interface Props {
  phase:         Phase;
  patientId:     string;
  selectedDrugs: string[];  // Dynamic drugs from API
  cpicResults:   CPICResult[];
  fullResults:   AnalysisResult[];
  resultsToShow: (CPICResult | AnalysisResult)[];
  showResults:   boolean;
  error:         string | null;
  copied:        boolean;
  analysisMeta:  { cpicMs: number; totalMs: number; genesAnalyzed: string[] } | null;
  variantCount:  number;
  onDownloadPDF: () => void;
  onCopyJSON:    () => void;
  onDownloadJSON: () => void;
}

export function AnalysisResults({
  phase,
  patientId,
  selectedDrugs,
  cpicResults,
  fullResults,
  resultsToShow,
  showResults,
  error,
  copied,
  analysisMeta,
  variantCount,
  onDownloadPDF,
  onCopyJSON,
  onDownloadJSON,
}: Props) {
  return (
    <>
      {/* Error */}
      {phase === "error" && error && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4"
        >
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">Analysis failed</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Skeleton cards during analyzing phase */}
      <AnimatePresence>
        {phase === "analyzing" && (
          <motion.div
            key="skeletons"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div>
              <Skeleton className="h-5 w-48 mb-1.5" />
              <Skeleton className="h-3.5 w-64" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {selectedDrugs.map((drug) => (
                <ResultSkeleton key={drug} drugName={drug} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            {/* Results header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg tracking-tight">Results — {patientId}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {phase === "explaining" ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Risk assessment complete. Generating AI explanations…
                    </span>
                  ) : (
                    `Full pharmacogenomic report · ${resultsToShow.length} drug${resultsToShow.length > 1 ? "s" : ""} analyzed`
                  )}
                </p>
              </div>

              {resultsToShow.length > 0 && (
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={onDownloadPDF} className="gap-1.5 text-xs">
                    <FileText className="h-3.5 w-3.5" />
                    Download PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={onCopyJSON} className="gap-1.5 text-xs">
                    {copied
                      ? <><CheckCheck className="h-3.5 w-3.5 text-primary" />Copied</>
                      : <><Copy className="h-3.5 w-3.5" />Copy JSON</>
                    }
                  </Button>
                  <Button variant="outline" size="sm" onClick={onDownloadJSON} className="gap-1.5 text-xs">
                    <Download className="h-3.5 w-3.5" />
                    JSON
                  </Button>
                </div>
              )}
            </div>

            {/* Performance metrics */}
            {analysisMeta && phase === "done" && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>CPIC: <span className="font-semibold text-foreground">{analysisMeta.cpicMs}ms</span></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Total: <span className="font-semibold text-foreground">{analysisMeta.totalMs}ms</span></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Dna className="h-3.5 w-3.5" />
                  <span>Variants: <span className="font-semibold text-foreground">{variantCount}</span></span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FlaskConical className="h-3.5 w-3.5" />
                  <span>Genes: <span className="font-semibold text-foreground">{analysisMeta.genesAnalyzed.join(", ")}</span></span>
                </div>
              </div>
            )}

            {/* Partial genotype warning */}
            {cpicResults.some((r) => r.risk_assessment.confidence_score < 0.9) && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">Partial Genotype Data Detected</p>
                  <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                    One or more genes have incomplete allele data (confidence &lt; 95%). Results marked with lower confidence
                    assume a normal (*1) allele for the missing copy. Confirm with full genotyping for clinical decisions.
                  </p>
                </div>
              </div>
            )}

            {/* Drug comparison table */}
            <DrugComparisonTable cpicResults={cpicResults} />

            {/* Result cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {cpicResults.map((cpicResult, i) => {
                const fullResult = fullResults.find((r) => r.drug === cpicResult.drug);
                return (
                  <motion.div
                    key={cpicResult.drug}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}
                  >
                    <ResultCard
                      result={fullResult ?? cpicResult}
                      isLoadingExplain={phase === "explaining" && !fullResult}
                    />
                  </motion.div>
                );
              })}
            </div>

            {/* CPIC attribution note */}
            {phase === "done" && (
              <p className="text-xs text-muted-foreground/60 text-center pt-2">
                Risk classifications based on CPIC Tier 1A guidelines. For research and clinical decision support only.
                Always confirm with a qualified clinician before any prescribing decision.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* System Architecture accordion */}
      {showResults && (
        <Accordion type="single" collapsible>
          <AccordionItem value="arch" className="rounded-xl border border-border bg-card px-5 shadow-card">
            <AccordionTrigger className="text-sm font-semibold py-4 hover:no-underline">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                System Architecture
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pb-4 text-sm text-muted-foreground">
                <pre className="rounded-lg bg-muted/50 border border-border p-4 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre">{`Browser (Client)
  ├── FileReader API parses .vcf text (no server upload)
  ├── Extracts variants: gene, star allele, rsID
  └── Sends compact JSON to API

Phase 1 — POST /api/analyze (deterministic, <200ms)
  ├── lib/validator.ts  → validates variants, drugs, patientId
  ├── lib/cpic.ts       → diplotype → phenotype → risk label
  ├── Confidence: 0.95 (both alleles) / 0.70 (one) / 0.30 (none)
  └── Returns CPICResult[] — zero AI calls

Phase 2 — POST /api/explain-single × N (AI, parallel)
  ├── Browser fires N parallel requests (one per drug)
  ├── lib/gemini.ts     → focused single-drug prompt
  ├── lib/ai.ts         → waterfall: Gemini → OpenRouter → OpenAI
  └── Each card fills independently as its response arrives

Key Design Decisions:
  • Risk prediction is 100% deterministic (CPIC tables)
  • AI is used ONLY for explanation generation
  • VCF never leaves the browser — privacy by design
  • Parallel per-drug AI calls → first result in ~2s
  • Provider waterfall ensures 99%+ uptime`}</pre>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </>
  );
}
