"use client";

import { useState }         from "react";
import Link                  from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button }            from "@/components/ui/button";
import { Input }             from "@/components/ui/input";
import { Badge }             from "@/components/ui/badge";
import { Separator }         from "@/components/ui/separator";
import { Skeleton }          from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { VCFUpload }         from "@/components/vcf-upload";
import { DrugInput }         from "@/components/drug-input";
import { ResultCard }        from "@/components/result-card";
import type { VCFVariant, SupportedDrug, SupportedGene, AnalysisResult } from "@/lib/types";
import { generatePDFReport }   from "@/lib/pdf-report";
import { buildDiplotype, getPhenotype } from "@/lib/cpic";
import {
  Download,
  Copy,
  CheckCheck,
  FlaskConical,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  Info,
  Clock,
  Dna,
  AlertTriangle,
  FileText,
  Heart,
  Shield,
  Lock,
  CircleCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "analyzing" | "explaining" | "done" | "error";
type CPICResult = Omit<AnalysisResult, "llm_generated_explanation">;

// ─── Section step label ───────────────────────────────────────────────────────

function StepLabel({ step, label, muted }: { step: string; label: string; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${muted ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
        {step}
      </span>
      <span className="text-xs font-bold uppercase tracking-widest text-foreground/80">{label}</span>
    </div>
  );
}

// ─── Loading result skeleton ──────────────────────────────────────────────────

function ResultSkeleton(_props: { drugName: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/40">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="p-5 space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
    </div>
  );
}

// ─── Phase progress indicator ─────────────────────────────────────────────────

function PhaseIndicator({ phase }: { phase: Phase }) {
  if (phase !== "analyzing" && phase !== "explaining") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-accent border border-primary/20"
    >
      <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
      <div>
        <p className="text-sm font-medium text-primary">
          {phase === "analyzing" ? "Running CPIC Analysis…" : "Generating AI Explanations…"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {phase === "analyzing"
            ? "Deterministic lookup against CPIC tables — no AI involved."
            : "Gemini is explaining the molecular mechanism for each drug."}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  const [variants,      setVariants]      = useState<VCFVariant[]>([]);
  const [patientId,     setPatientId]     = useState("");
  const [selectedDrugs, setSelectedDrugs] = useState<SupportedDrug[]>([]);

  const [phase,       setPhase]       = useState<Phase>("idle");
  const [cpicResults, setCpicResults] = useState<CPICResult[]>([]);
  const [fullResults, setFullResults] = useState<AnalysisResult[]>([]);
  const [error,       setError]       = useState<string | null>(null);
  const [copied,      setCopied]      = useState(false);
  const [analysisMeta, setAnalysisMeta] = useState<{ cpicMs: number; totalMs: number; genesAnalyzed: string[] } | null>(null);

  const canAnalyze    = variants.length > 0 && selectedDrugs.length > 0 && patientId.trim().length > 0;
  const isLoading     = phase === "analyzing" || phase === "explaining";
  const resultsToShow = fullResults.length > 0 ? fullResults : cpicResults;

  async function handleAnalyze() {
    setPhase("analyzing");
    setError(null);
    setCpicResults([]);
    setFullResults([]);
    setAnalysisMeta(null);

    const t0 = performance.now();

    const analyzeRes = await fetch("/api/analyze", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ variants, drugs: selectedDrugs, patientId: patientId.trim() }),
    });

    if (!analyzeRes.ok) {
      const err = await analyzeRes.json().catch(() => ({ error: "Analysis failed." }));
      setError(err.error ?? "Analysis failed.");
      setPhase("error");
      return;
    }

    const { results: cpic } = await analyzeRes.json();
    const cpicMs = Math.round(performance.now() - t0);
    const genesAnalyzed = cpic.length > 0 ? cpic[0].quality_metrics.genes_analyzed : [];
    setCpicResults(cpic);
    setPhase("explaining");

    const explainRes = await fetch("/api/explain", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ results: cpic }),
    });

    if (explainRes.ok) {
      const { results: full } = await explainRes.json();
      setFullResults(full);
    }

    const totalMs = Math.round(performance.now() - t0);
    setAnalysisMeta({ cpicMs, totalMs, genesAnalyzed });
    setPhase("done");
  }

  function downloadJSON() {
    const data = JSON.stringify(resultsToShow, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `pharma-guard-${patientId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyJSON() {
    await navigator.clipboard.writeText(JSON.stringify(resultsToShow, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const showResults = cpicResults.length > 0 || phase === "done";

  return (
    <div className="min-h-screen bg-background">

      {/* ── Topbar ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground -ml-1"
            >
              <Link href="/">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>

            <Separator orientation="vertical" className="h-4" />

            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <FlaskConical className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">PharmaGuard</span>
            </div>
          </div>

          <Badge variant="secondary" className="text-xs font-medium">
            Patient Analysis
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8 space-y-6">

        {/* ── Page title — warm, human framing ── */}
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

        {/* ── Input card ── */}
        <Card className="shadow-card-md border-border overflow-hidden">
          <CardContent className="p-0">

            {/* Section 01 — Patient Details (supporting — visually lighter) */}
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

            {/* Section 02 — Genetic Data (primary action) */}
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
              {/* ── Genotype confidence + gene phenotype heatmap ── */}
              {variants.length > 0 && (() => {
                const ALL_GENES: SupportedGene[] = ["CYP2D6", "CYP2C19", "CYP2C9", "SLCO1B1", "TPMT", "DPYD"];
                const foundGenes = new Set(variants.map((v) => v.gene));
                const coverage = foundGenes.size;
                const completeness = coverage >= 5 ? "High" : coverage >= 3 ? "Moderate" : "Low";
                const compColor = coverage >= 5 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : coverage >= 3 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-orange-700 bg-orange-50 border-orange-200";
                const actionableCount = variants.filter((v) => v.starAllele !== "*1").length;

                const PHENOTYPE_HEAT: Record<string, string> = {
                  PM:  "bg-red-100 text-red-700 border-red-200",
                  IM:  "bg-amber-100 text-amber-700 border-amber-200",
                  NM:  "bg-emerald-100 text-emerald-700 border-emerald-200",
                  RM:  "bg-blue-100 text-blue-700 border-blue-200",
                  URM: "bg-violet-100 text-violet-700 border-violet-200",
                  Unknown: "bg-muted text-muted-foreground border-border",
                };
                const PHENOTYPE_FULL: Record<string, string> = {
                  PM: "Poor Metabolizer", IM: "Intermediate", NM: "Normal",
                  RM: "Rapid", URM: "Ultrarapid", Unknown: "—",
                };

                return (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 space-y-3">
                    {/* Summary line */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <p className="flex items-center gap-1.5 text-xs text-emerald-800">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span className="font-bold">{coverage}/{ALL_GENES.length} genes</span>
                        <span className="text-emerald-700 font-normal">· {variants.length} variant{variants.length > 1 ? "s" : ""}{actionableCount > 0 ? ` · ${actionableCount} actionable` : ""}</span>
                      </p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${compColor}`}>{completeness}</span>
                    </div>

                    {/* Gene phenotype heatmap */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {ALL_GENES.map((g) => {
                        const found = foundGenes.has(g);
                        const diplotype = found ? (buildDiplotype(variants, g) ?? "*1/*1") : null;
                        const phenotype = diplotype ? getPhenotype(g, diplotype) : "Unknown";
                        const heat = found ? PHENOTYPE_HEAT[phenotype] : "bg-muted/50 text-muted-foreground/30 border-border";
                        return (
                          <div key={g} className={`rounded-md border px-2 py-1.5 text-center ${heat} ${!found ? "opacity-40" : ""}`}>
                            <p className="text-[10px] font-mono font-bold leading-none">{g}</p>
                            {found && (
                              <>
                                <p className="text-[9px] font-mono mt-1 opacity-70">{diplotype}</p>
                                <p className="text-[10px] font-bold mt-0.5">{PHENOTYPE_FULL[phenotype]}</p>
                              </>
                            )}
                            {!found && <p className="text-[9px] mt-1">No data</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

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

            {/* Section 03 — Drug Selection (primary action) */}
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
                  <span className="text-[10px] text-emerald-600 ml-auto">{patientId} · {variants.length} variants · {selectedDrugs.length} drug{selectedDrugs.length > 1 ? "s" : ""}</span>
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
                    {!variants.length  && "Upload a VCF file. "}
                    {!patientId.trim() && "Enter a patient ID. "}
                    {!selectedDrugs.length && "Select at least one drug."}
                  </p>
                )}
              </div>

              {/* What happens next — pre-empt the phases */}
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
                {isLoading && (
                  <PhaseIndicator key="phase" phase={phase} />
                )}
              </AnimatePresence>

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
            </div>
          </CardContent>
        </Card>

        {/* ── Skeleton cards during analyzing phase ── */}
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

        {/* ── Results ── */}
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
                  <h2 className="font-bold text-lg tracking-tight">
                    Results — {patientId}
                  </h2>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generatePDFReport(resultsToShow, patientId, variants.length)}
                      className="gap-1.5 text-xs"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyJSON}
                      className="gap-1.5 text-xs"
                    >
                      {copied ? (
                        <><CheckCheck className="h-3.5 w-3.5 text-primary" />Copied</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5" />Copy JSON</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadJSON}
                      className="gap-1.5 text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      JSON
                    </Button>
                  </div>
                )}
              </div>

              {/* ── Performance metrics ── */}
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
                    <span>Variants: <span className="font-semibold text-foreground">{variants.length}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FlaskConical className="h-3.5 w-3.5" />
                    <span>Genes: <span className="font-semibold text-foreground">{analysisMeta.genesAnalyzed.join(", ")}</span></span>
                  </div>
                </div>
              )}

              {/* ── Partial genotype warning ── */}
              {cpicResults.some((r) => r.risk_assessment.confidence_score < 0.9) && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Partial Genotype Data Detected</p>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                      One or more genes have incomplete allele data (confidence &lt; 95%). Results marked with lower confidence assume a normal (*1) allele for the missing copy. Confirm with full genotyping for clinical decisions.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Drug comparison table ── */}
              {cpicResults.length > 1 && (
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
                      {cpicResults.map((r) => {
                        const riskColors: Record<string, string> = {
                          "Safe":          "text-emerald-700 bg-emerald-50",
                          "Adjust Dosage": "text-amber-700 bg-amber-50",
                          "Toxic":         "text-red-700 bg-red-50",
                          "Ineffective":   "text-orange-700 bg-orange-50",
                          "Unknown":       "text-muted-foreground bg-muted",
                        };
                        return (
                          <tr key={r.drug} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-2 font-semibold text-foreground">{r.drug}</td>
                            <td className="px-3 py-2 font-mono text-muted-foreground">{r.pharmacogenomic_profile.primary_gene}</td>
                            <td className="px-3 py-2 font-mono">{r.pharmacogenomic_profile.diplotype}</td>
                            <td className="px-3 py-2">{r.pharmacogenomic_profile.phenotype}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${riskColors[r.risk_assessment.risk_label] ?? ""}`}>
                                {r.risk_assessment.risk_label}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-medium tabular-nums">{Math.round(r.risk_assessment.confidence_score * 100)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Result cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                {cpicResults.map((cpicResult, i) => {
                  const fullResult = fullResults.find((r) => r.drug === cpicResult.drug);
                  return (
                    <motion.div
                      key={cpicResult.drug}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        ease: [0.22, 1, 0.36, 1],
                        delay: i * 0.06,
                      }}
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

        {/* ── System Architecture — only shown after results exist ── */}
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

Phase 2 — POST /api/explain (AI, ~2-5s)
  ├── lib/gemini.ts     → builds ONE batched prompt for all drugs
  ├── lib/ai.ts         → waterfall: Gemini → OpenRouter → OpenAI
  └── Returns LLM explanation with mechanism + citations

Key Design Decisions:
  • Risk prediction is 100% deterministic (CPIC tables)
  • AI is used ONLY for explanation generation
  • VCF never leaves the browser — privacy by design
  • Single API call regardless of drug count
  • Provider waterfall ensures 99%+ uptime`}</pre>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </main>
    </div>
  );
}
