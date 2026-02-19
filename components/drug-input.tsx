"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn }     from "@/lib/utils";
import type { SupportedDrug } from "@/lib/types";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";

// ─── Drug catalogue ───────────────────────────────────────────────────────────

const ALL_DRUGS: {
  drug:        SupportedDrug;
  gene:        string;
  description: string;
  category:    string;
}[] = [
  { drug: "CODEINE",       gene: "CYP2D6",  description: "Opioid analgesic",       category: "Pain" },
  { drug: "TRAMADOL",      gene: "CYP2D6",  description: "Opioid analgesic",       category: "Pain" },
  { drug: "WARFARIN",      gene: "CYP2C9",  description: "Anticoagulant",           category: "Cardio" },
  { drug: "CLOPIDOGREL",   gene: "CYP2C19", description: "Antiplatelet agent",      category: "Cardio" },
  { drug: "OMEPRAZOLE",    gene: "CYP2C19", description: "Proton pump inhibitor",   category: "GI" },
  { drug: "SIMVASTATIN",   gene: "SLCO1B1", description: "Statin / cholesterol",    category: "Cardio" },
  { drug: "CELECOXIB",     gene: "CYP2C9",  description: "NSAID / anti-inflammatory", category: "Pain" },
  { drug: "AZATHIOPRINE",  gene: "TPMT",    description: "Immunosuppressant",       category: "Immuno" },
  { drug: "FLUOROURACIL",  gene: "DPYD",    description: "Chemotherapy agent",      category: "Oncology" },
  { drug: "CAPECITABINE",  gene: "DPYD",    description: "Oral chemotherapy agent", category: "Oncology" },
];

// ─── Category badge colour ────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Pain:     "bg-orange-100 text-orange-700",
  Cardio:   "bg-rose-100   text-rose-700",
  GI:       "bg-teal-100   text-teal-700",
  Immuno:   "bg-violet-100 text-violet-700",
  Oncology: "bg-sky-100    text-sky-700",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface DrugInputProps {
  selected: SupportedDrug[];
  onChange: (drugs: SupportedDrug[]) => void;
}

// ─── Name → drug resolver (case-insensitive) ────────────────────────────────

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

function resolveDrugs(text: string): SupportedDrug[] {
  return text
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((name) => DRUG_ALIASES[name])
    .filter((d): d is SupportedDrug => !!d);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DrugInput({ selected, onChange }: DrugInputProps) {
  const [textValue, setTextValue] = useState("");
  const [textError, setTextError] = useState<string | null>(null);

  function toggle(drug: SupportedDrug) {
    onChange(
      selected.includes(drug)
        ? selected.filter((d) => d !== drug)
        : [...selected, drug]
    );
  }

  function handleTextSubmit() {
    if (!textValue.trim()) return;
    const resolved = resolveDrugs(textValue);
    if (resolved.length === 0) {
      setTextError("No recognized drugs. Try: codeine, warfarin, clopidogrel, simvastatin, azathioprine, fluorouracil");
      return;
    }
    const merged = [...new Set([...selected, ...resolved])];
    onChange(merged);
    setTextValue("");
    setTextError(null);
  }

  const allSelected = selected.length === ALL_DRUGS.length;

  return (
    <div className="space-y-3">
      {/* Controls row */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {selected.length === 0
            ? "Select one or more drugs to evaluate"
            : (
              <span className="font-medium text-primary">
                {selected.length} drug{selected.length > 1 ? "s" : ""} selected
              </span>
            )}
        </p>
        <div className="flex gap-1">
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

      {/* Drug grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {ALL_DRUGS.map(({ drug, gene, description, category }) => {
          const isSelected = selected.includes(drug);

          return (
            <motion.button
              key={drug}
              type="button"
              onClick={() => toggle(drug)}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "group relative flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left",
                "transition-all duration-200 focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary bg-accent shadow-card"
                  : "border-border bg-card hover:border-primary/40 hover:bg-accent/30 shadow-card"
              )}
            >
              {/* Gene label */}
              <span className={cn(
                "font-mono text-[10px] font-semibold uppercase tracking-wide",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}>
                {gene}
              </span>

              {/* Drug name */}
              <span className={cn(
                "text-sm font-bold leading-tight",
                isSelected ? "text-foreground" : "text-foreground"
              )}>
                {drug}
              </span>

              {/* Description */}
              <span className="text-xs text-muted-foreground leading-tight">{description}</span>

              {/* Category + selected indicator */}
              <div className="mt-1 flex items-center justify-between w-full">
                <span className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
                  CATEGORY_COLORS[category]
                )}>
                  {category}
                </span>
                <motion.span
                  initial={false}
                  animate={isSelected ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.18 }}
                >
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </motion.span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Text input — satisfies "comma-separated text input" spec */}
      <div className="space-y-1.5">
        <label className="block text-xs text-muted-foreground">
          Or type drug names (comma-separated)
        </label>
        <div className="flex gap-2">
          <Input
            value={textValue}
            onChange={(e) => { setTextValue(e.target.value); setTextError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleTextSubmit(); } }}
            placeholder="e.g. codeine, warfarin, simvastatin"
            className="h-9 text-sm flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-3 text-xs shrink-0"
            onClick={handleTextSubmit}
            disabled={!textValue.trim()}
          >
            Add
          </Button>
        </div>
        {textError && (
          <p className="text-xs text-destructive">{textError}</p>
        )}
      </div>
    </div>
  );
}
