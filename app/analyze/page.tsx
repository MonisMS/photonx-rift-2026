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
import { VCFUpload }         from "@/components/vcf-upload";
import { DrugInput }         from "@/components/drug-input";
import { ResultCard }        from "@/components/result-card";
import type { VCFVariant, SupportedDrug, AnalysisResult } from "@/lib/types";
import {
  Download,
  Copy,
  CheckCheck,
  FlaskConical,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Sparkles,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "analyzing" | "explaining" | "done" | "error";
type CPICResult = Omit<AnalysisResult, "llm_generated_explanation">;

// ─── Section step label ───────────────────────────────────────────────────────

function StepLabel({ step, label }: { step: string; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
        {step}
      </span>
      <span className="text-sm font-semibold text-foreground">{label}</span>
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

  const canAnalyze    = variants.length > 0 && selectedDrugs.length > 0 && patientId.trim().length > 0;
  const isLoading     = phase === "analyzing" || phase === "explaining";
  const resultsToShow = fullResults.length > 0 ? fullResults : cpicResults;

  async function handleAnalyze() {
    setPhase("analyzing");
    setError(null);
    setCpicResults([]);
    setFullResults([]);

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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
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

      <main className="mx-auto max-w-5xl px-5 py-10 space-y-8">

        {/* ── Page title ── */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pharmacogenomic Risk Analysis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a patient&apos;s VCF file, select drugs, and receive an instant risk report based on CPIC clinical guidelines.
          </p>
        </div>

        {/* ── Input card ── */}
        <Card className="shadow-card-md border-border overflow-hidden">
          <CardContent className="p-0">

            {/* Section 01 — Patient Details */}
            <div className="p-6 md:p-8">
              <StepLabel step="01" label="Patient Details" />
              <div className="max-w-xs">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Patient ID
                </label>
                <Input
                  placeholder="e.g. PATIENT_001"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="h-10"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Used to label the report — never transmitted beyond this session.
                </p>
              </div>
            </div>

            <Separator />

            {/* Section 02 — Genetic Data */}
            <div className="p-6 md:p-8">
              <StepLabel step="02" label="Genetic Data (VCF File)" />
              <VCFUpload
                onParsed={(v, pid) => {
                  setVariants(v);
                  if (!patientId) setPatientId(pid);
                }}
                onClear={() => setVariants([])}
              />
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                {variants.length > 0 && (
                  <p className="text-xs text-primary font-medium">
                    ✓ {variants.length} pharmacogenomic variant{variants.length > 1 ? "s" : ""} detected
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
            </div>

            <Separator />

            {/* Section 03 — Drug Selection */}
            <div className="p-6 md:p-8">
              <StepLabel step="03" label="Select Drugs to Analyze" />
              <DrugInput selected={selectedDrugs} onChange={setSelectedDrugs} />
            </div>

            <Separator />

            {/* Submit + status */}
            <div className="p-6 md:p-8 space-y-4 bg-muted/20">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleAnalyze}
                  disabled={!canAnalyze || isLoading}
                  className="h-11 px-8 text-sm font-semibold shadow-card"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {phase === "analyzing" ? "Analyzing…" : "Generating Report…"}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Run Analysis
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
                  <div className="flex gap-2 shrink-0">
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
                      Download
                    </Button>
                  </div>
                )}
              </div>

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
      </main>
    </div>
  );
}
