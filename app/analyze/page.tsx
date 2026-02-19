"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { VCFUpload } from "@/components/vcf-upload";
import { DrugInput } from "@/components/drug-input";
import { useAnalysisSession }   from "@/hooks/use-analysis-session";
import { AnalyzeTopbar }        from "@/components/analyze/analyze-topbar";
import { StepLabel }            from "@/components/analyze/step-label";
import { PhaseIndicator }       from "@/components/analyze/phase-indicator";
import { GeneHeatmap }          from "@/components/analyze/gene-heatmap";
import { AnalysisResults }      from "@/components/analyze/analysis-results";
import {
  Sparkles, Loader2, Heart, ShieldCheck, Info, Lock, Shield, CircleCheck,
} from "lucide-react";

export default function AnalyzePage() {
  const session = useAnalysisSession();
  const {
    variants, setVariants,
    patientId, setPatientId,
    selectedDrugs, setSelectedDrugs,
    phase,
    cpicResults, fullResults,
    error, copied,
    analysisMeta,
    canAnalyze, isLoading, resultsToShow, showResults,
    clearSession, handleAnalyze, downloadJSON, copyJSON, downloadPDF,
  } = session;

  return (
    <div className="min-h-screen bg-background">

      <AnalyzeTopbar
        cpicResults={cpicResults}
        variants={variants}
        onClear={clearSession}
      />

      <main className="mx-auto max-w-4xl px-5 py-8 space-y-6">

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pharmacogenomic Risk Analysis</h1>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="h-3.5 w-3.5 text-red-400 shrink-0" />
            Preventing adverse drug reactions through personalized genomics.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Risk predictions: 100% CPIC lookup tables — zero AI
            </span>
            <span className="hidden sm:inline opacity-30">|</span>
            <span className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              Research &amp; clinical decision support only
            </span>
          </div>
        </div>

        {/* Input card */}
        <Card className="shadow-card-md border-border overflow-hidden">
          <CardContent className="p-0">

            {/* Section 01 — Patient ID */}
            <div className="px-6 py-5 md:px-8 md:py-6 bg-muted/10">
              <StepLabel step="01" label="Patient Identification" muted />
              <div className="max-w-sm">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    Patient ID
                  </label>
                  <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                    Required
                  </span>
                </div>
                <Input
                  placeholder="e.g. PATIENT_001"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className={`h-10 font-mono ${patientId.trim() ? "border-primary/40 bg-accent/30" : ""}`}
                />
                <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                  Required for report generation. Stays local — never transmitted.
                </p>
              </div>
            </div>

            <Separator />

            {/* Section 02 — VCF Upload */}
            <div className="p-6 md:p-8 border-l-2 border-l-primary/30">
              <StepLabel step="02" label="Genetic Data (VCF File)" />
              <div className="-mt-2 mb-4">
                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2">
                  <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800">Genomic data stays on your device</p>
                    <p className="text-[10px] text-emerald-600 leading-snug">Parsed locally in your browser — never uploaded to any server.</p>
                  </div>
                </div>
              </div>

              <VCFUpload
                onParsed={(v, pid) => {
                  setVariants(v);
                  if (!patientId) setPatientId(pid);
                }}
                onClear={() => setVariants([])}
              />

              {/* Gene phenotype heatmap */}
              {variants.length > 0 && <GeneHeatmap variants={variants} />}

              {/* Sample file links */}
              <div className="mt-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                Sample files:
                {[
                  { label: "All Normal",    file: "sample_all_normal.vcf"    },
                  { label: "Codeine PM",    file: "sample_codeine_pm.vcf"    },
                  { label: "Codeine Toxic", file: "sample_codeine_toxic.vcf" },
                  { label: "Multi Risk",    file: "sample_multi_risk.vcf"    },
                ].map(({ label, file }, i) => (
                  <span key={file}>
                    {i > 0 && <span className="mx-1 opacity-40">·</span>}
                    <a
                      href={`/samples/${file}`}
                      download
                      className="underline underline-offset-2 hover:text-foreground transition-colors"
                    >
                      {label}
                    </a>
                  </span>
                ))}
              </div>
            </div>

            <Separator />

            {/* Section 03 — Drug Selection */}
            <div className="p-6 md:p-8 border-l-2 border-l-primary/30">
              <StepLabel step="03" label="Select Drugs to Analyze" />
              <DrugInput selected={selectedDrugs} onChange={setSelectedDrugs} />
            </div>

            <Separator />

            {/* Submit + status */}
            <div className="p-6 md:p-8 space-y-4 bg-muted/20">

              {/* Readiness indicator */}
              {canAnalyze && !isLoading && phase === "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5"
                >
                  <CircleCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <p className="text-xs font-semibold text-emerald-800">Ready to generate report</p>
                  <span className="text-[10px] text-emerald-600 ml-auto">
                    {patientId} · {variants.length} variants · {selectedDrugs.length} drug{selectedDrugs.length > 1 ? "s" : ""}
                  </span>
                </motion.div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Button
                  onClick={handleAnalyze}
                  disabled={!canAnalyze || isLoading}
                  className={`h-12 px-10 text-sm font-bold shadow-card-md tracking-wide ${canAnalyze && !isLoading ? "animate-cta-pulse" : ""}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {phase === "analyzing" ? "Running CPIC Analysis…" : "Generating AI Explanations…"}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Pharmacogenomic Report
                    </>
                  )}
                </Button>

                {!canAnalyze && !isLoading && (
                  <p className="text-xs text-muted-foreground">
                    {!variants.length    && "Upload a VCF file. "}
                    {!patientId.trim()   && "Enter a patient ID. "}
                    {!selectedDrugs.length && "Select at least one drug."}
                  </p>
                )}
              </div>

              {/* What happens next */}
              {!isLoading && phase === "idle" && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">1</span>
                    Instant CPIC risk analysis
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">2</span>
                    AI explanation generation (~3s)
                  </span>
                </div>
              )}

              <AnimatePresence mode="wait">
                {isLoading && <PhaseIndicator key="phase" phase={phase} />}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Results section */}
        <AnalysisResults
          phase={phase}
          patientId={patientId}
          selectedDrugs={selectedDrugs}
          cpicResults={cpicResults}
          fullResults={fullResults}
          resultsToShow={resultsToShow}
          showResults={showResults}
          error={error}
          copied={copied}
          analysisMeta={analysisMeta}
          variantCount={variants.length}
          onDownloadPDF={downloadPDF}
          onCopyJSON={copyJSON}
          onDownloadJSON={downloadJSON}
        />

      </main>
    </div>
  );
}
