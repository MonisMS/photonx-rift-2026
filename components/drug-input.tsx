"use client";

import { motion } from "framer-motion";
import { cn }     from "@/lib/utils";
import type { SupportedDrug } from "@/lib/types";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Drug catalogue ───────────────────────────────────────────────────────────

const ALL_DRUGS: {
  drug:        SupportedDrug;
  gene:        string;
  description: string;
  category:    string;
}[] = [
  { drug: "CODEINE",       gene: "CYP2D6",  description: "Opioid analgesic",       category: "Pain" },
  { drug: "WARFARIN",      gene: "CYP2C9",  description: "Anticoagulant",           category: "Cardio" },
  { drug: "CLOPIDOGREL",   gene: "CYP2C19", description: "Antiplatelet agent",      category: "Cardio" },
  { drug: "SIMVASTATIN",   gene: "SLCO1B1", description: "Statin / cholesterol",    category: "Cardio" },
  { drug: "AZATHIOPRINE",  gene: "TPMT",    description: "Immunosuppressant",       category: "Immuno" },
  { drug: "FLUOROURACIL",  gene: "DPYD",    description: "Chemotherapy agent",      category: "Oncology" },
];

// ─── Category badge colour ────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Pain:     "bg-orange-100 text-orange-700",
  Cardio:   "bg-rose-100   text-rose-700",
  Immuno:   "bg-violet-100 text-violet-700",
  Oncology: "bg-sky-100    text-sky-700",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface DrugInputProps {
  selected: SupportedDrug[];
  onChange: (drugs: SupportedDrug[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DrugInput({ selected, onChange }: DrugInputProps) {
  function toggle(drug: SupportedDrug) {
    onChange(
      selected.includes(drug)
        ? selected.filter((d) => d !== drug)
        : [...selected, drug]
    );
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
    </div>
  );
}
