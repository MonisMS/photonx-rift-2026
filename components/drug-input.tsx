"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn }     from "@/lib/utils";
import type { SupportedDrug } from "@/lib/types";
import { Search, X, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Drug catalogue ───────────────────────────────────────────────────────────

interface DrugEntry {
  drug:        SupportedDrug;
  gene:        string;
  description: string;
  category:    string;
}

const ALL_DRUGS: DrugEntry[] = [
  { drug: "CODEINE",       gene: "CYP2D6",  description: "Opioid analgesic",         category: "Pain" },
  { drug: "TRAMADOL",      gene: "CYP2D6",  description: "Opioid analgesic",         category: "Pain" },
  { drug: "WARFARIN",      gene: "CYP2C9",  description: "Anticoagulant",            category: "Cardio" },
  { drug: "CLOPIDOGREL",   gene: "CYP2C19", description: "Antiplatelet agent",       category: "Cardio" },
  { drug: "OMEPRAZOLE",    gene: "CYP2C19", description: "Proton pump inhibitor",    category: "GI" },
  { drug: "SIMVASTATIN",   gene: "SLCO1B1", description: "Statin / cholesterol",     category: "Cardio" },
  { drug: "CELECOXIB",     gene: "CYP2C9",  description: "NSAID / anti-inflammatory", category: "Pain" },
  { drug: "AZATHIOPRINE",  gene: "TPMT",    description: "Immunosuppressant",        category: "Immuno" },
  { drug: "FLUOROURACIL",  gene: "DPYD",    description: "Chemotherapy agent",       category: "Oncology" },
  { drug: "CAPECITABINE",  gene: "DPYD",    description: "Oral chemotherapy agent",  category: "Oncology" },
];

// ─── Category badge colour ────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Pain:     "bg-orange-100 text-orange-700",
  Cardio:   "bg-rose-100   text-rose-700",
  GI:       "bg-teal-100   text-teal-700",
  Immuno:   "bg-violet-100 text-violet-700",
  Oncology: "bg-sky-100    text-sky-700",
};

// ─── Brand-name aliases (case-insensitive) ────────────────────────────────────

const DRUG_ALIASES: Record<string, SupportedDrug> = {};
for (const { drug } of ALL_DRUGS) {
  DRUG_ALIASES[drug.toLowerCase()] = drug;
}
DRUG_ALIASES["5-fu"]       = "FLUOROURACIL";
DRUG_ALIASES["5fu"]        = "FLUOROURACIL";
DRUG_ALIASES["xeloda"]     = "CAPECITABINE";
DRUG_ALIASES["celebrex"]   = "CELECOXIB";
DRUG_ALIASES["prilosec"]   = "OMEPRAZOLE";
DRUG_ALIASES["losec"]      = "OMEPRAZOLE";
DRUG_ALIASES["ultram"]     = "TRAMADOL";
DRUG_ALIASES["plavix"]     = "CLOPIDOGREL";
DRUG_ALIASES["coumadin"]   = "WARFARIN";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DrugInputProps {
  selected: SupportedDrug[];
  onChange: (drugs: SupportedDrug[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DrugInput({ selected, onChange }: DrugInputProps) {
  const [query, setQuery]     = useState("");
  const [open, setOpen]       = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  // ── Close on outside click ──
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Filter logic ──
  const lowerQuery = query.toLowerCase().trim();
  const filtered = lowerQuery
    ? ALL_DRUGS.filter((d) =>
        d.drug.toLowerCase().includes(lowerQuery) ||
        d.gene.toLowerCase().includes(lowerQuery) ||
        d.category.toLowerCase().includes(lowerQuery) ||
        d.description.toLowerCase().includes(lowerQuery) ||
        // Check aliases
        Object.entries(DRUG_ALIASES).some(
          ([alias, target]) => target === d.drug && alias.includes(lowerQuery)
        )
      )
    : ALL_DRUGS;

  // ── Toggle ──
  const toggle = useCallback((drug: SupportedDrug) => {
    onChange(
      selected.includes(drug)
        ? selected.filter((d) => d !== drug)
        : [...selected, drug]
    );
  }, [selected, onChange]);

  // ── Comma-separated batch add ──
  function handleCommaBatch() {
    if (!query.includes(",")) return false;
    const names = query.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const resolved = names.map((n) => DRUG_ALIASES[n]).filter((d): d is SupportedDrug => !!d);
    if (resolved.length > 0) {
      const merged = [...new Set([...selected, ...resolved])];
      onChange(merged);
      setQuery("");
      return true;
    }
    return false;
  }

  // ── Keyboard navigation ──
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setFocusIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (handleCommaBatch()) return;
      if (focusIdx >= 0 && focusIdx < filtered.length) {
        toggle(filtered[focusIdx].drug);
      } else if (filtered.length === 1) {
        toggle(filtered[0].drug);
        setQuery("");
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  // Reset focus index when filter changes
  useEffect(() => { setFocusIdx(-1); }, [query]);

  const allSelected = selected.length === ALL_DRUGS.length;

  // Get entry for a selected drug
  function getEntry(drug: SupportedDrug): DrugEntry {
    return ALL_DRUGS.find((d) => d.drug === drug)!;
  }

  return (
    <div className="space-y-3" ref={containerRef}>

      {/* ── Search input ── */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search drugs... (e.g. codeine, warfarin, CYP2D6)"
            className={cn(
              "flex h-10 w-full rounded-lg border border-border bg-card pl-9 pr-10 py-2 text-sm",
              "placeholder:text-muted-foreground/60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
              "transition-colors",
              open && "ring-2 ring-primary ring-offset-1"
            )}
          />
          <button
            type="button"
            onClick={() => { setOpen(!open); if (!open) inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/60 transition-colors"
            tabIndex={-1}
          >
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Type to filter · comma-separated for batch add · or browse the list below
        </p>

        {/* ── Dropdown ── */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-card-md overflow-hidden"
            >
              <div className="max-h-64 overflow-y-auto overscroll-contain">
                {filtered.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No matching drugs found.
                  </p>
                ) : (
                  filtered.map((entry, i) => {
                    const isSelected = selected.includes(entry.drug);
                    const isFocused  = i === focusIdx;

                    return (
                      <button
                        key={entry.drug}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { toggle(entry.drug); inputRef.current?.focus(); }}
                        onMouseEnter={() => setFocusIdx(i)}
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors",
                          isFocused && "bg-accent",
                          isSelected && !isFocused && "bg-accent/50",
                          !isFocused && !isSelected && "hover:bg-muted/40",
                        )}
                      >
                        {/* Check indicator */}
                        <div className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-border"
                        )}>
                          {isSelected && (
                            <svg viewBox="0 0 12 12" className="h-3 w-3 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="2,6 5,9 10,3" />
                            </svg>
                          )}
                        </div>

                        {/* Gene tag */}
                        <span className="font-mono text-[10px] font-semibold text-muted-foreground w-14 shrink-0">
                          {entry.gene}
                        </span>

                        {/* Drug name + description */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold">{entry.drug}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{entry.description}</span>
                        </div>

                        {/* Category badge */}
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0",
                          CATEGORY_COLORS[entry.category]
                        )}>
                          {entry.category}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Selected chips + controls ── */}
      <div className="flex flex-wrap items-center gap-2">
        <AnimatePresence mode="popLayout">
          {selected.map((drug) => {
            const entry = getEntry(drug);
            return (
              <motion.span
                key={drug}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-accent px-2.5 py-1 text-xs font-medium"
              >
                <span className="font-mono text-[10px] text-muted-foreground">{entry.gene}</span>
                <span className="font-semibold">{drug}</span>
                <button
                  type="button"
                  onClick={() => toggle(drug)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label={`Remove ${drug}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            );
          })}
        </AnimatePresence>

        {/* Select All / Clear */}
        {selected.length > 0 && (
          <span className="text-xs text-muted-foreground ml-1">
            {selected.length}/{ALL_DRUGS.length}
          </span>
        )}
        <div className="flex gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange(ALL_DRUGS.map((d) => d.drug))}
            disabled={allSelected}
          >
            Select all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onChange([])}
            disabled={selected.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
