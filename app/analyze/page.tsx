"use client";

import { useState }         from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button }           from "@/components/ui/button";
import { Input }            from "@/components/ui/input";
import { Badge }            from "@/components/ui/badge";
import { Separator }        from "@/components/ui/separator";
import { VCFUpload }        from "@/components/vcf-upload";
import { DrugInput }        from "@/components/drug-input";
import { ResultCard }       from "@/components/result-card";
import type { VCFVariant, SupportedDrug, AnalysisResult } from "@/lib/types";
import { Download, Copy, CheckCheck, FlaskConical, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "analyzing" | "explaining" | "done" | "error";
type CPICResult = Omit<AnalysisResult, "llm_generated_explanation">;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  // Input state
  const [variants,      setVariants]      = useState<VCFVariant[]>([]);
  const [patientId,     setPatientId]     = useState("");
  const [selectedDrugs, setSelectedDrugs] = useState<SupportedDrug[]>([]);

  // Result state
  const [phase,         setPhase]         = useState<Phase>("idle");
  const [cpicResults,   setCpicResults]   = useState<CPICResult[]>([]);
  const [fullResults,   setFullResults]   = useState<AnalysisResult[]>([]);
  const [error,         setError]         = useState<string | null>(null);
  const [copied,        setCopied]        = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────
  const canAnalyze  = variants.length > 0 && selectedDrugs.length > 0 && patientId.trim().length > 0;
  const isLoading   = phase === "analyzing" || phase === "explaining";
  const resultsToShow = fullResults.length > 0 ? fullResults : cpicResults;

  // ── Analysis Handler ───────────────────────────────────────────────────────
  async function handleAnalyze() {
    setPhase("analyzing");
    setError(null);
    setCpicResults([]);
    setFullResults([]);

    // Phase 1: CPIC (instant)
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

    // Phase 2: Gemini explanations (parallel, takes a few seconds)
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

  // ── JSON Download ──────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted/40">

      {/* ── Header ── */}
      <header className="border-b bg-background">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="font-bold text-lg leading-tight">PharmaGuard</h1>
            <p className="text-xs text-muted-foreground">Pharmacogenomic Risk Prediction</p>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">RIFT 2026</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">

        {/* ── Input Card ── */}
        <Card>
          <CardHeader>
            <CardTitle>Analyze Patient</CardTitle>
            <CardDescription>
              Upload a VCF file and select drugs to generate a pharmacogenomic risk report.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Patient ID */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Patient ID</label>
              <Input
                placeholder="e.g. PATIENT_001"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="max-w-xs"
              />
            </div>

            <Separator />

            {/* VCF Upload */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Genetic Data (VCF File)</label>
              <VCFUpload
                onParsed={(v, pid) => {
                  setVariants(v);
                  if (!patientId) setPatientId(pid);
                }}
                onClear={() => setVariants([])}
              />
              {variants.length > 0 && (
                <p className="text-xs text-green-600">
                  {variants.length} pharmacogenomic variant{variants.length > 1 ? "s" : ""} detected
                </p>
              )}
            </div>

            <Separator />

            {/* Drug Selection */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Select Drugs to Analyze</label>
              <DrugInput selected={selectedDrugs} onChange={setSelectedDrugs} />
            </div>

            <Separator />

            {/* Submit */}
            <div className="flex items-center gap-4">
              <Button
                onClick={handleAnalyze}
                disabled={!canAnalyze || isLoading}
                className="min-w-36"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {phase === "analyzing" ? "Analyzing…" : "Generating report…"}
                  </>
                ) : (
                  "Analyze"
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

            {/* Error */}
            {phase === "error" && error && (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* ── Results ── */}
        {(cpicResults.length > 0 || phase === "done") && (
          <div className="space-y-4">

            {/* Results header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">Results — {patientId}</h2>
                <p className="text-sm text-muted-foreground">
                  {phase === "explaining"
                    ? "Risk assessment complete. Generating AI explanations…"
                    : "Full pharmacogenomic report ready."}
                </p>
              </div>
              {resultsToShow.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyJSON}>
                    {copied
                      ? <><CheckCheck className="h-4 w-4 mr-1 text-green-600" /> Copied</>
                      : <><Copy className="h-4 w-4 mr-1" /> Copy JSON</>
                    }
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadJSON}>
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                </div>
              )}
            </div>

            {/* Result cards grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {cpicResults.map((cpicResult) => {
                const fullResult = fullResults.find((r) => r.drug === cpicResult.drug);
                return (
                  <ResultCard
                    key={cpicResult.drug}
                    result={fullResult ?? cpicResult}
                    isLoadingExplain={phase === "explaining" && !fullResult}
                  />
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
