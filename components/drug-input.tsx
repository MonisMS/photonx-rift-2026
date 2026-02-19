"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn }     from "@/lib/utils";
import { Search, X, ChevronDown, Loader2, Cloud, Database, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Drug Entry Type ──────────────────────────────────────────────────────────

export interface DrugEntry {
  drugId:       string;     // RxNorm ID or internal ID
  name:         string;     // lowercase for matching
  displayName:  string;     // Title case for display
  gene:         string;
  description?: string;
  category:     string;
  cpicLevel?:   string;     // A, B, C, D
}

// ─── Core 6 drugs required by problem statement ─────────────────────────────────

const CORE_6_DRUGS = [
  "codeine", "warfarin", "clopidogrel", "simvastatin", "azathioprine", "fluorouracil",
];

// ─── Hardcoded fallback drugs ─────────────────────────────────────────────────

const HARDCODED_DRUGS: DrugEntry[] = [
  { drugId: "RxNorm:2670", name: "codeine", displayName: "Codeine", gene: "CYP2D6", description: "Opioid analgesic", category: "Pain", cpicLevel: "A" },
  { drugId: "RxNorm:10689", name: "tramadol", displayName: "Tramadol", gene: "CYP2D6", description: "Opioid analgesic", category: "Pain", cpicLevel: "A" },
  { drugId: "RxNorm:11289", name: "warfarin", displayName: "Warfarin", gene: "CYP2C9", description: "Anticoagulant", category: "Cardio", cpicLevel: "A" },
  { drugId: "RxNorm:32968", name: "clopidogrel", displayName: "Clopidogrel", gene: "CYP2C19", description: "Antiplatelet agent", category: "Cardio", cpicLevel: "A" },
  { drugId: "RxNorm:7646", name: "omeprazole", displayName: "Omeprazole", gene: "CYP2C19", description: "Proton pump inhibitor", category: "GI", cpicLevel: "A" },
  { drugId: "RxNorm:36567", name: "simvastatin", displayName: "Simvastatin", gene: "SLCO1B1", description: "Statin / cholesterol", category: "Cardio", cpicLevel: "A" },
  { drugId: "RxNorm:140587", name: "celecoxib", displayName: "Celecoxib", gene: "CYP2C9", description: "NSAID / anti-inflammatory", category: "Pain", cpicLevel: "A" },
  { drugId: "RxNorm:1256", name: "azathioprine", displayName: "Azathioprine", gene: "TPMT", description: "Immunosuppressant", category: "Immuno", cpicLevel: "A" },
  { drugId: "RxNorm:4492", name: "fluorouracil", displayName: "Fluorouracil", gene: "DPYD", description: "Chemotherapy agent", category: "Oncology", cpicLevel: "A" },
  { drugId: "RxNorm:194000", name: "capecitabine", displayName: "Capecitabine", gene: "DPYD", description: "Oral chemotherapy agent", category: "Oncology", cpicLevel: "A" },
];

// ─── Category badge colour ────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Pain:        "bg-orange-100 text-orange-700",
  Cardio:      "bg-rose-100   text-rose-700",
  GI:          "bg-teal-100   text-teal-700",
  Immuno:      "bg-violet-100 text-violet-700",
  Oncology:    "bg-sky-100    text-sky-700",
  Psychiatry:  "bg-purple-100 text-purple-700",
  Neurology:   "bg-amber-100  text-amber-700",
  Infectious:  "bg-green-100  text-green-700",
  Anesthesia:  "bg-pink-100   text-pink-700",
  Antibiotics: "bg-lime-100   text-lime-700",
  Rheumatology: "bg-cyan-100  text-cyan-700",
  Other:       "bg-gray-100   text-gray-700",
};

// ─── Brand-name aliases (case-insensitive) ────────────────────────────────────

const DRUG_ALIASES: Record<string, string> = {
  "5-fu":       "fluorouracil",
  "5fu":        "fluorouracil",
  "xeloda":     "capecitabine",
  "celebrex":   "celecoxib",
  "prilosec":   "omeprazole",
  "losec":      "omeprazole",
  "ultram":     "tramadol",
  "plavix":     "clopidogrel",
  "coumadin":   "warfarin",
  "zocor":      "simvastatin",
  "lipitor":    "atorvastatin",
  "celexa":     "citalopram",
  "lexapro":    "escitalopram",
  "effexor":    "venlafaxine",
  "prozac":     "fluoxetine",
  "paxil":      "paroxetine",
  "zoloft":     "sertraline",
  "tegretol":   "carbamazepine",
  "dilantin":   "phenytoin",
  "imuran":     "azathioprine",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface DrugInputProps {
  selected: string[];  // Array of drug names (lowercase)
  onChange: (drugs: string[]) => void;
  enableDynamicLoading?: boolean;  // Default true - fetch from API
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DrugInput({ selected, onChange, enableDynamicLoading = true }: DrugInputProps) {
  const [query, setQuery]     = useState("");
  const [open, setOpen]       = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  
  // Dynamic drug loading state
  const [allDrugs, setAllDrugs] = useState<DrugEntry[]>(HARDCODED_DRUGS);
  const [isLoading, setIsLoading] = useState(false);
  const [dataSource, setDataSource] = useState<"hardcoded" | "api">("hardcoded");
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // ── Load drugs from API ──
  useEffect(() => {
    if (!enableDynamicLoading || hasLoadedRef.current) return;
    
    async function loadDrugs() {
      setIsLoading(true);
      setLoadError(null);
      
      try {
        const response = await fetch("/api/drugs");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (data.drugs && data.drugs.length > 0) {
          // Add descriptions to API drugs
          const enrichedDrugs: DrugEntry[] = data.drugs.map((d: DrugEntry) => ({
            ...d,
            description: d.description || getDescription(d.name, d.gene),
          }));
          
          setAllDrugs(enrichedDrugs);
          setDataSource(data.source || "api");
        }
      } catch (error) {
        console.error("[DrugInput] Failed to load drugs from API:", error);
        setLoadError(error instanceof Error ? error.message : "Failed to load");
        // Keep using hardcoded drugs
      } finally {
        setIsLoading(false);
        hasLoadedRef.current = true;
      }
    }
    
    loadDrugs();
  }, [enableDynamicLoading]);

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
    ? allDrugs.filter((d) =>
        d.name.includes(lowerQuery) ||
        d.displayName.toLowerCase().includes(lowerQuery) ||
        d.gene.toLowerCase().includes(lowerQuery) ||
        d.category.toLowerCase().includes(lowerQuery) ||
        (d.description?.toLowerCase().includes(lowerQuery)) ||
        // Check aliases
        Object.entries(DRUG_ALIASES).some(
          ([alias, target]) => target === d.name && alias.includes(lowerQuery)
        )
      )
    : allDrugs;

  // ── Toggle ──
  const toggle = useCallback((drugName: string) => {
    onChange(
      selected.includes(drugName)
        ? selected.filter((d) => d !== drugName)
        : [...selected, drugName]
    );
  }, [selected, onChange]);

  // ── Comma-separated batch add ──
  function handleCommaBatch() {
    if (!query.includes(",")) return false;
    const names = query.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const resolved = names.map((n) => {
      // Check alias first
      const aliased = DRUG_ALIASES[n];
      if (aliased) return aliased;
      // Check if it matches a drug name directly
      const drug = allDrugs.find(d => d.name === n);
      return drug?.name;
    }).filter((d): d is string => !!d);
    
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
        toggle(filtered[focusIdx].name);
      } else if (filtered.length === 1) {
        toggle(filtered[0].name);
        setQuery("");
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  // Reset focus index when filter changes
  useEffect(() => { setFocusIdx(-1); }, [query]);

  const allSelected = selected.length === allDrugs.length;

  // Get entry for a selected drug
  function getEntry(drugName: string): DrugEntry | undefined {
    return allDrugs.find((d) => d.name === drugName);
  }

  return (
    <div className="space-y-3" ref={containerRef}>

      {/* ── Data source indicator ── */}
      {dataSource === "api" && !isLoading && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Cloud className="h-3 w-3 text-primary" />
          <span>{allDrugs.length} drugs loaded from CPIC API</span>
        </div>
      )}
      {dataSource === "hardcoded" && !isLoading && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Database className="h-3 w-3" />
          <span>{allDrugs.length} drugs (core set)</span>
          {loadError && <span className="text-orange-600">· API unavailable</span>}
        </div>
      )}

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
            placeholder={isLoading ? "Loading drugs..." : "Search drugs... (e.g. codeine, warfarin, CYP2D6)"}
            disabled={isLoading}
            className={cn(
              "flex h-10 w-full rounded-lg border border-border bg-card pl-9 pr-10 py-2 text-sm",
              "placeholder:text-muted-foreground/60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
              "transition-colors",
              open && "ring-2 ring-primary ring-offset-1",
              isLoading && "opacity-60"
            )}
          />
          {isLoading ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <button
              type="button"
              onClick={() => { setOpen(!open); if (!open) inputRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted/60 transition-colors"
              tabIndex={-1}
            >
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </button>
          )}
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Type to filter · comma-separated for batch add · or browse the list below
        </p>

        {/* ── Dropdown ── */}
        <AnimatePresence>
          {open && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-card-md overflow-hidden"
            >
              <div className="max-h-72 overflow-y-auto overscroll-contain">
                {filtered.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No matching drugs found.
                  </p>
                ) : (
                  filtered.map((entry, i) => {
                    const isSelected = selected.includes(entry.name);
                    const isFocused  = i === focusIdx;

                    return (
                      <button
                        key={entry.drugId}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { toggle(entry.name); inputRef.current?.focus(); }}
                        onMouseEnter={() => setFocusIdx(i)}
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors",
                          isFocused && "bg-muted/60",
                          isSelected && !isFocused && "bg-accent/30",
                          !isFocused && !isSelected && "hover:bg-muted/30",
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
                          <span className="text-sm font-semibold">{entry.displayName}</span>
                          {entry.description && (
                            <span className="ml-2 text-xs text-muted-foreground truncate">{entry.description}</span>
                          )}
                        </div>

                        {/* CPIC Level badge */}
                        {entry.cpicLevel && (
                          <span className={cn(
                            "text-[9px] font-bold px-1 py-0.5 rounded shrink-0",
                            entry.cpicLevel === "A" && "bg-green-100 text-green-700",
                            entry.cpicLevel === "B" && "bg-yellow-100 text-yellow-700",
                            entry.cpicLevel === "C" && "bg-orange-100 text-orange-700",
                            entry.cpicLevel === "D" && "bg-gray-100 text-gray-700",
                          )}>
                            CPIC-{entry.cpicLevel}
                          </span>
                        )}

                        {/* Category badge */}
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0",
                          CATEGORY_COLORS[entry.category] || CATEGORY_COLORS["Other"]
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
          {selected.map((drugName) => {
            const entry = getEntry(drugName);
            if (!entry) return null;
            
            return (
              <motion.span
                key={drugName}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-accent px-3 py-1 text-xs font-medium"
              >
                <span className="font-mono text-[10px] text-muted-foreground">{entry.gene}</span>
                <span className="font-semibold">{entry.displayName}</span>
                <button
                  type="button"
                  onClick={() => toggle(drugName)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label={`Remove ${entry.displayName}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            );
          })}
        </AnimatePresence>

        {/* Select All / Clear */}
        {selected.length > 0 && (
          <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground ml-1">
            {selected.length} drug{selected.length > 1 ? "s" : ""} selected
          </span>
        )}
        <div className="flex gap-1 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs text-primary font-semibold hover:text-primary hover:bg-primary/10"
            onClick={() => onChange(CORE_6_DRUGS)}
            disabled={selected.length === 6 && CORE_6_DRUGS.every(d => selected.includes(d))}
          >
            <Star className="h-3 w-3 mr-1" />
            Core 6
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

// ─── Helper: Generate description for API drugs ───────────────────────────────

function getDescription(drugName: string, gene: string): string {
  const name = drugName.toLowerCase();
  
  // Common drug descriptions
  const descriptions: Record<string, string> = {
    // Pain
    codeine: "Opioid analgesic",
    tramadol: "Opioid analgesic",
    morphine: "Opioid analgesic",
    oxycodone: "Opioid analgesic",
    hydrocodone: "Opioid analgesic",
    fentanyl: "Opioid analgesic",
    buprenorphine: "Opioid partial agonist",
    alfentanil: "Opioid analgesic (IV)",
    methadone: "Opioid analgesic",
    
    // NSAIDs
    celecoxib: "NSAID / COX-2 inhibitor",
    diclofenac: "NSAID",
    ibuprofen: "NSAID",
    piroxicam: "NSAID",
    meloxicam: "NSAID",
    aspirin: "NSAID / antiplatelet",
    
    // Cardio
    warfarin: "Anticoagulant",
    clopidogrel: "Antiplatelet agent",
    prasugrel: "Antiplatelet agent",
    ticagrelor: "Antiplatelet agent",
    simvastatin: "Statin / cholesterol",
    atorvastatin: "Statin / cholesterol",
    rosuvastatin: "Statin / cholesterol",
    pravastatin: "Statin / cholesterol",
    fluvastatin: "Statin / cholesterol",
    lovastatin: "Statin / cholesterol",
    
    // GI
    omeprazole: "Proton pump inhibitor",
    esomeprazole: "Proton pump inhibitor",
    lansoprazole: "Proton pump inhibitor",
    pantoprazole: "Proton pump inhibitor",
    rabeprazole: "Proton pump inhibitor",
    dexlansoprazole: "Proton pump inhibitor",
    
    // Psychiatry
    amitriptyline: "Tricyclic antidepressant",
    nortriptyline: "Tricyclic antidepressant",
    imipramine: "Tricyclic antidepressant",
    desipramine: "Tricyclic antidepressant",
    clomipramine: "Tricyclic antidepressant",
    doxepin: "Tricyclic antidepressant",
    citalopram: "SSRI antidepressant",
    escitalopram: "SSRI antidepressant",
    sertraline: "SSRI antidepressant",
    paroxetine: "SSRI antidepressant",
    fluoxetine: "SSRI antidepressant",
    fluvoxamine: "SSRI antidepressant",
    venlafaxine: "SNRI antidepressant",
    desvenlafaxine: "SNRI antidepressant",
    atomoxetine: "ADHD medication",
    
    // Neurology
    carbamazepine: "Anticonvulsant",
    phenytoin: "Anticonvulsant",
    oxcarbazepine: "Anticonvulsant",
    lamotrigine: "Anticonvulsant",
    
    // Oncology
    fluorouracil: "Chemotherapy agent",
    capecitabine: "Oral chemotherapy",
    mercaptopurine: "Antimetabolite",
    thioguanine: "Antimetabolite",
    irinotecan: "Chemotherapy agent",
    tamoxifen: "Hormone therapy",
    
    // Immuno
    azathioprine: "Immunosuppressant",
    tacrolimus: "Immunosuppressant",
    
    // Infectious
    abacavir: "Antiretroviral (HIV)",
    atazanavir: "Antiretroviral (HIV)",
    efavirenz: "Antiretroviral (HIV)",
    
    // Other
    allopurinol: "Uric acid reducer",
    rasburicase: "Uric acid reducer",
  };
  
  if (descriptions[name]) return descriptions[name];
  
  // Gene-based fallback
  if (gene === "CYP2D6") return "CYP2D6 substrate";
  if (gene === "CYP2C19") return "CYP2C19 substrate";
  if (gene === "CYP2C9") return "CYP2C9 substrate";
  if (gene === "DPYD") return "Fluoropyrimidine";
  if (gene === "TPMT" || gene === "NUDT15") return "Thiopurine";
  if (gene === "SLCO1B1") return "Statin";
  if (gene === "G6PD") return "G6PD-sensitive drug";
  if (gene === "HLA-B" || gene === "HLA-A") return "HLA-associated drug";
  
  return "Pharmacogenomic drug";
}
