"use client";

import { useState, useEffect, useCallback } from "react";
import type { VCFVariant, SupportedGene, AnalysisResult } from "@/lib/types";
import { generatePDFReport } from "@/lib/pdf-report";

type Phase = "idle" | "analyzing" | "explaining" | "done" | "error";
type CPICResult = Omit<AnalysisResult, "llm_generated_explanation">;

const STORAGE_KEY = "pharmaguard-session";

interface StoredSession {
  patientId:     string;
  variants:      VCFVariant[];
  genesDetected: SupportedGene[];
  selectedDrugs: string[];  // Dynamic drugs from API (lowercase names)
  cpicResults:   CPICResult[];
  fullResults:   AnalysisResult[];
  analysisMeta:  { cpicMs: number; totalMs: number; genesAnalyzed: string[] } | null;
  savedAt:       number;
}

export function useAnalysisSession() {
  const [variants,      setVariants]      = useState<VCFVariant[]>([]);
  const [genesDetected, setGenesDetected] = useState<SupportedGene[]>([]);
  const [patientId,     setPatientId]     = useState("");
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);  // Dynamic drugs
  const [phase,         setPhase]         = useState<Phase>("idle");
  const [cpicResults,   setCpicResults]   = useState<CPICResult[]>([]);
  const [fullResults,   setFullResults]   = useState<AnalysisResult[]>([]);
  const [error,         setError]         = useState<string | null>(null);
  const [copied,        setCopied]        = useState(false);
  const [analysisMeta,  setAnalysisMeta]  = useState<{ cpicMs: number; totalMs: number; genesAnalyzed: string[] } | null>(null);
  const [hydrated,      setHydrated]      = useState(false);

  // ── Hydrate from localStorage on mount ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const session: StoredSession = JSON.parse(raw);
        if (Date.now() - session.savedAt < 24 * 60 * 60 * 1000) {
          setPatientId(session.patientId);
          setVariants(session.variants);
          setGenesDetected(session.genesDetected ?? []);
          setSelectedDrugs(session.selectedDrugs);
          setCpicResults(session.cpicResults);
          setFullResults(session.fullResults);
          setAnalysisMeta(session.analysisMeta);
          if (session.cpicResults.length > 0) setPhase("done");
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // Corrupted data — ignore
    }
    setHydrated(true);
  }, []);

  // ── Persist to localStorage when results change ──
  const saveSession = useCallback(() => {
    if (!hydrated) return;
    try {
      const session: StoredSession = {
        patientId,
        variants,
        genesDetected,
        selectedDrugs,
        cpicResults,
        fullResults,
        analysisMeta,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage full or unavailable — ignore
    }
  }, [hydrated, patientId, variants, genesDetected, selectedDrugs, cpicResults, fullResults, analysisMeta]);

  useEffect(() => {
    saveSession();
  }, [saveSession]);

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
    setVariants([]);
    setGenesDetected([]);
    setPatientId("");
    setSelectedDrugs([]);
    setCpicResults([]);
    setFullResults([]);
    setAnalysisMeta(null);
    setError(null);
    setPhase("idle");
  }

  async function handleAnalyze() {
    setPhase("analyzing");
    setError(null);
    setCpicResults([]);
    setFullResults([]);
    setAnalysisMeta(null);

    const t0 = performance.now();

    // Normalize drug names to UPPERCASE for API compatibility
    const normalizedDrugs = selectedDrugs.map(d => d.toUpperCase());
    
    const analyzeRes = await fetch("/api/analyze", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ variants, drugs: normalizedDrugs, patientId: patientId.trim(), genesDetected }),
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

    const pending = (cpic as CPICResult[]).map(async (cpicResult: CPICResult) => {
      try {
        const res = await fetch("/api/explain-single", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ result: cpicResult }),
        });
        if (res.ok) {
          const { result: full } = await res.json();
          setFullResults((prev) => {
            const updated = prev.filter((r) => r.drug !== full.drug);
            return [...updated, full];
          });
        }
      } catch {
        // Individual failure is fine — card stays without explanation
      }
    });

    await Promise.all(pending);

    const totalMs = Math.round(performance.now() - t0);
    setAnalysisMeta({ cpicMs, totalMs, genesAnalyzed });
    setPhase("done");
  }

  function downloadJSON() {
    const resultsToShow = fullResults.length > 0 ? fullResults : cpicResults;
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
    const resultsToShow = fullResults.length > 0 ? fullResults : cpicResults;
    await navigator.clipboard.writeText(JSON.stringify(resultsToShow, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadPDF() {
    const resultsToShow = fullResults.length > 0 ? fullResults : cpicResults;
    generatePDFReport(resultsToShow, patientId, variants.length);
  }

  const hasGeneticData = variants.length > 0 || genesDetected.length > 0;
  const canAnalyze     = hasGeneticData && selectedDrugs.length > 0 && patientId.trim().length > 0;
  const isLoading     = phase === "analyzing" || phase === "explaining";
  const resultsToShow = fullResults.length > 0 ? fullResults : cpicResults;
  const showResults   = cpicResults.length > 0 || phase === "done";

  return {
    // State
    variants,      setVariants,
    genesDetected, setGenesDetected,
    patientId,     setPatientId,
    selectedDrugs, setSelectedDrugs,
    phase,
    cpicResults,
    fullResults,
    error,
    copied,
    analysisMeta,
    // Derived
    canAnalyze,
    isLoading,
    resultsToShow,
    showResults,
    // Actions
    clearSession,
    handleAnalyze,
    downloadJSON,
    copyJSON,
    downloadPDF,
  };
}
