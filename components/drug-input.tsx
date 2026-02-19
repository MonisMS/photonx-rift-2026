"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SupportedDrug } from "@/lib/types";

const ALL_DRUGS: { drug: SupportedDrug; gene: string; description: string }[] = [
  { drug: "CODEINE",       gene: "CYP2D6",  description: "Painkiller"          },
  { drug: "WARFARIN",      gene: "CYP2C9",  description: "Blood thinner"        },
  { drug: "CLOPIDOGREL",   gene: "CYP2C19", description: "Antiplatelet"         },
  { drug: "SIMVASTATIN",   gene: "SLCO1B1", description: "Cholesterol"          },
  { drug: "AZATHIOPRINE",  gene: "TPMT",    description: "Immune suppressant"   },
  { drug: "FLUOROURACIL",  gene: "DPYD",    description: "Chemotherapy"         },
];

interface DrugInputProps {
  selected:   SupportedDrug[];
  onChange:   (drugs: SupportedDrug[]) => void;
}

export function DrugInput({ selected, onChange }: DrugInputProps) {
  function toggle(drug: SupportedDrug) {
    onChange(
      selected.includes(drug)
        ? selected.filter((d) => d !== drug)
        : [...selected, drug]
    );
  }

  function selectAll() {
    onChange(ALL_DRUGS.map((d) => d.drug));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selected.length === 0
            ? "Select drugs to analyze"
            : `${selected.length} drug${selected.length > 1 ? "s" : ""} selected`}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll}>Select all</Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>Clear</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ALL_DRUGS.map(({ drug, gene, description }) => {
          const isSelected = selected.includes(drug);
          return (
            <button
              key={drug}
              type="button"
              onClick={() => toggle(drug)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                isSelected
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-border hover:border-muted-foreground/50 hover:bg-muted/40"
              )}
            >
              <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {gene}
              </span>
              <span className="font-medium text-sm">{drug}</span>
              <span className="text-xs text-muted-foreground">{description}</span>
              {isSelected && (
                <Badge className="mt-1 bg-blue-500 text-white text-xs px-1.5 py-0">
                  Selected
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
