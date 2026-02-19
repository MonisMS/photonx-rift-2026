"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input }     from "@/components/ui/input";
import { cn }        from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { VCFUpload } from "@/components/vcf-upload";
import { DrugInput } from "@/components/drug-input";
import { useAnalysisSession }   from "@/hooks/use-analysis-session";
import { AnalyzeTopbar }        from "@/components/analyze/analyze-topbar";
import { StepProgress }         from "@/components/analyze/step-progress";
import { PhaseIndicator }       from "@/components/analyze/phase-indicator";
import { GeneHeatmap }          from "@/components/analyze/gene-heatmap";
import { AnalysisResults }      from "@/components/analyze/analysis-results";
import {
  Activity, Loader2, Heart, ShieldCheck, Info, Lock, Shield, CircleCheck,
} from "lucide-react";

// ─── Analyze page motion system ──────────────────────────────────────────────
//
// Mount-based animations (not scroll-triggered) since content is in the
// initial viewport. Sections stagger by 0.08s for a cascading reveal.
// All animations respect useReducedMotion().

/** Delay before the first section begins animating (lets the card scale in) */
const BASE_DELAY = 0.15;

/** Stagger interval between consecutive sections */
const STAGGER = 0.08;

/** Build transition config for a staggered section */
const sectionTiming = (i: number) => ({
  duration: 0.5,
  ease: "easeOut" as const,
  delay: BASE_DELAY + i * STAGGER,
});

/** Spring config for button hover / tap */
const BUTTON_SPRING = { type: "spring", stiffness: 400, damping: 17 } as const;

// ─────────────────────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  const shouldReduce = useReducedMotion();
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

  /** Shared entrance props for each card section */
  const section = (index: number) => ({
    initial: shouldReduce ? (false as const) : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: shouldReduce ? { duration: 0 } : sectionTiming(index),
    whileHover: shouldReduce ? undefined : { y: -4, transition: { duration: 0.2 } },
  });

  return (
    <div className="min-h-screen bg-background bg-dna-subtle">

      <AnalyzeTopbar
        cpicResults={cpicResults}
        variants={variants}
        onClear={clearSession}
      />

      <main className="relative z-[1] mx-auto max-w-4xl px-5 py-8 space-y-6">

        {/* ── Page title ── */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Pharmacogenomic Risk Analysis</h1>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="h-3.5 w-3.5 text-red-400 shrink-0" />
            Preventing adverse drug reactions through personalized genomics.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
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
        </motion.div>

        {/* ── Input card — scale + opacity on mount ── */}
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: shouldReduce ? 0 : 0.1 }}
        >
          <Card className="shadow-card-md border-border overflow-hidden">
            <CardContent className="p-0">

              {/* Step progress flow */}
              <StepProgress
                steps={[
                  { label: "Patient ID", complete: !!patientId.trim() },
                  { label: "Genetic Data", complete: variants.length > 0 },
                  { label: "Drug Selection", complete: selectedDrugs.length > 0 },
                ]}
              />

              <Separator />

              {/* Section 01 — Patient ID */}
              <motion.div
                {...section(0)}
                className="transition-shadow duration-200 hover:shadow-md"
              >
                <div className="px-6 py-5 md:px-8 md:py-6 bg-muted/10">
                  <div className="mb-4 space-y-0.5">
                    <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Patient Data</p>
                    <h3 className="text-lg font-bold text-foreground">Patient Identification</h3>
                  </div>
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
                    <p className="mt-1.5 flex items-center gap-1 text-[13px] text-muted-foreground">
                      <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                      Required for report generation. Stays local — never transmitted.
                    </p>
                  </div>
                </div>
              </motion.div>

              <Separator />

              {/* Section 02 — VCF Upload */}
              <motion.div
                {...section(1)}
                className="transition-shadow duration-200 hover:shadow-md"
              >
                <div className="p-6 md:p-8 border-l-2 border-l-primary/30">
                  <div className="mb-4 space-y-0.5">
                    <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Genetic Data</p>
                    <h3 className="text-lg font-bold text-foreground">VCF File Upload</h3>
                  </div>
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
                  <div className="mt-3 flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
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
              </motion.div>

              <Separator />

              {/* Section 03 — Drug Selection */}
              <motion.div
                {...section(2)}
                className="transition-shadow duration-200 hover:shadow-md"
              >
                <div className="p-6 md:p-8 border-l-2 border-l-primary/30">
                  <div className="mb-4 space-y-0.5">
                    <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Drug Selection</p>
                    <h3 className="text-lg font-bold text-foreground">Select Drugs to Analyze</h3>
                  </div>
                  <DrugInput selected={selectedDrugs} onChange={setSelectedDrugs} />
                </div>
              </motion.div>

              <Separator />

              {/* Submit + status */}
              <motion.div
                {...section(3)}
                className="transition-shadow duration-200 hover:shadow-md"
              >
                <div className="p-6 md:p-8 space-y-4 bg-muted/20">

                  {/* Readiness indicator */}
                  {canAnalyze && !isLoading && phase === "idle" && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5"
                    >
                      <CircleCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <p className="text-xs font-semibold text-emerald-800">Ready to run analysis</p>
                      <span className="text-[10px] text-emerald-600 ml-auto">
                        {patientId} · {variants.length} variants · {selectedDrugs.length} drug{selectedDrugs.length > 1 ? "s" : ""}
                      </span>
                    </motion.div>
                  )}

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <motion.button
                      onClick={handleAnalyze}
                      disabled={!canAnalyze || isLoading}
                      whileHover={
                        shouldReduce || !canAnalyze || isLoading
                          ? undefined
                          : { y: -2 }
                      }
                      whileTap={
                        shouldReduce || !canAnalyze || isLoading
                          ? undefined
                          : { scale: 0.98 }
                      }
                      transition={BUTTON_SPRING}
                      className={cn(
                        "btn-clinical relative h-12 px-10 rounded-lg text-sm font-bold tracking-wide",
                        "inline-flex items-center justify-center gap-2",
                        "bg-emerald-800 text-white",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
                        "overflow-hidden",
                      )}
                    >
                      {isLoading && (
                        <span className="absolute inset-0 animate-shimmer-clinical rounded-lg" />
                      )}
                      <span className="relative z-10 inline-flex items-center gap-2">
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analyzing…
                          </>
                        ) : (
                          <>
                            <Activity className="h-4 w-4" />
                            Run Clinical Risk Analysis
                          </>
                        )}
                      </span>
                    </motion.button>

                    {!canAnalyze && !isLoading && (
                      <p className="text-[13px] text-muted-foreground">
                        {!variants.length    && "Upload a VCF file. "}
                        {!patientId.trim()   && "Enter a patient ID. "}
                        {!selectedDrugs.length && "Select at least one drug."}
                      </p>
                    )}
                  </div>

                  {/* What happens next */}
                  {!isLoading && phase === "idle" && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
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
              </motion.div>

            </CardContent>
          </Card>
        </motion.div>

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
